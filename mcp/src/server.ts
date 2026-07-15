#!/usr/bin/env node
/**
 * PayGate MCP server.
 *
 * Exposes PayGate functions as MCP tools, so any MCP-compatible agent
 * (Claude Desktop, Cursor, OpenAI Agents, etc.) can:
 *   - register a new PayGate agent
 *   - inspect an existing agent's on-chain state
 *   - pause / resume an agent (the kill switch)
 *   - check the policy caps
 *
 * Run as a stdio MCP server (the standard way):
 *   npx @paygate/mcp
 *
 * Configure in Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "paygate": {
 *         "command": "npx",
 *         "args": ["-y", "@paygate/mcp"],
 *         "env": {
 *           "PAYGATE_PRIVATE_KEY": "0x...",
 *           "PAYGATE_OWNER": "0x...",
 *           "PAYGATE_REGISTRY": "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A"
 *         }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

const REGISTRY = (process.env.PAYGATE_REGISTRY ?? "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A") as Address;
const USDC = (process.env.PAYGATE_USDC ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;
const RPC = process.env.PAYGATE_RPC ?? "https://sepolia.base.org";
const CHAIN_ID = 84532;

const REGISTRY_ABI = [
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentWallet", type: "address" },
      { name: "perCallLimit", type: "uint128" },
      { name: "perEpochLimit", type: "uint128" },
      { name: "epochDuration", type: "uint64" },
      { name: "erc8004AgentId", type: "uint256" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [
      { name: "agentId", type: "uint256" },
      { name: "policyAddr", type: "address" },
    ],
  },
  {
    name: "getBinding",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "erc8004AgentId", type: "uint256" },
      { name: "agentWallet", type: "address" },
      { name: "policy", type: "address" },
      { name: "humanOwner", type: "address" },
      { name: "metadataURI", type: "string" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "deactivate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "reactivate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "setLimits",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "perCallLimit", type: "uint128" },
      { name: "perEpochLimit", type: "uint128" },
    ],
    outputs: [],
  },
] as const;

const POLICY_ABI = [
  {
    name: "getPolicy",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "perCallLimit", type: "uint128" },
      { name: "perEpochLimit", type: "uint128" },
      { name: "epochDuration", type: "uint64" },
      { name: "epochSpent", type: "uint128" },
      { name: "paused", type: "bool" },
    ],
  },
] as const;

// ===== server setup =====

const server = new Server(
  { name: "paygate", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "paygate_register",
      description: "Register a new PayGate agent on Base Sepolia. Returns the agentId and policy contract address.",
      inputSchema: {
        type: "object",
        properties: {
          perCallLimit: {
            type: "string",
            description: "Max USDC (6 decimals) per single x402 call. E.g. '10000' = $0.01. '0' = unlimited.",
          },
          perEpochLimit: {
            type: "string",
            description: "Max USDC per epoch. E.g. '1000000' = $1.00. '0' = unlimited.",
          },
          epochDurationSeconds: {
            type: "number",
            description: "Epoch length in seconds. Default 86400 (24h).",
          },
          metadataURI: {
            type: "string",
            description: "Optional metadata URI (ipfs:// or https://).",
          },
        },
        required: ["perCallLimit", "perEpochLimit"],
      },
    },
    {
      name: "paygate_inspect",
      description: "Inspect the on-chain state of a PayGate agent by ID.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "The PayGate agentId to inspect.",
          },
        },
        required: ["agentId"],
      },
    },
    {
      name: "paygate_pause",
      description: "Pause a PayGate agent (kill switch). One transaction, irreversible, no admin key.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "The PayGate agentId to pause." },
        },
        required: ["agentId"],
      },
    },
    {
      name: "paygate_resume",
      description: "Resume a paused PayGate agent.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string", description: "The PayGate agentId to resume." },
        },
        required: ["agentId"],
      },
    },
    {
      name: "paygate_set_limits",
      description: "Update the per-call and per-epoch caps for a PayGate agent.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          perCallLimit: { type: "string", description: "New per-call cap in 6-decimal USDC." },
          perEpochLimit: { type: "string", description: "New per-epoch cap in 6-decimal USDC." },
        },
        required: ["agentId", "perCallLimit", "perEpochLimit"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const pk = process.env.PAYGATE_PRIVATE_KEY as Hex | undefined;
  if (!pk) {
    return errorResult("PAYGATE_PRIVATE_KEY env var not set");
  }
  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

  try {
    switch (name) {
      case "paygate_register": {
        const a = args as { perCallLimit: string; perEpochLimit: string; epochDurationSeconds?: number; metadataURI?: string };
        const { encodeFunctionData } = await import("viem");
        const data = encodeFunctionData({
          abi: REGISTRY_ABI,
          functionName: "register",
          args: [
            account.address,
            BigInt(a.perCallLimit),
            BigInt(a.perEpochLimit),
            BigInt(a.epochDurationSeconds ?? 86400),
            0n,
            a.metadataURI ?? "",
          ],
        });
        const tx = await walletClient.sendTransaction({ to: REGISTRY, data, account });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx });
        return okResult(`Agent registered.\ntx: ${r.transactionHash}\nblock: ${r.blockNumber}\ndeployer: ${account.address}`);
      }

      case "paygate_inspect": {
        const a = args as { agentId: string };
        const agentId = BigInt(a.agentId);
        const binding = (await publicClient.readContract({
          address: REGISTRY,
          abi: REGISTRY_ABI,
          functionName: "getBinding",
          args: [agentId],
        } as any)) as readonly [bigint, string, string, string, string, boolean];

        const pol = (await publicClient.readContract({
          address: binding[2] as Address,
          abi: POLICY_ABI,
          functionName: "getPolicy",
        } as any).catch(() => null)) as readonly [bigint, bigint, bigint, bigint, boolean] | null;

        const usdc = (n: bigint) => `$${(Number(n) / 1e6).toFixed(4)}`;
        let msg = `PayGate agent ${agentId}\n`;
        msg += `  status: ${binding[5] ? "ACTIVE" : "DEACTIVATED"}\n`;
        msg += `  agentWallet: ${binding[1]}\n`;
        msg += `  humanOwner:  ${binding[3]}\n`;
        msg += `  policy:      ${binding[2]}\n`;
        if (pol) {
          msg += `  perCallLimit:  ${usdc(pol[0])} USDC\n`;
          msg += `  perEpochLimit: ${usdc(pol[1])} USDC\n`;
          msg += `  epochSpent:    ${usdc(pol[3])} USDC\n`;
          msg += `  paused:        ${pol[4] ? "YES (kill switch ON)" : "no"}\n`;
        }
        return okResult(msg);
      }

      case "paygate_pause": {
        const a = args as { agentId: string };
        const { encodeFunctionData } = await import("viem");
        const data = encodeFunctionData({
          abi: REGISTRY_ABI,
          functionName: "deactivate",
          args: [BigInt(a.agentId)],
        });
        const tx = await walletClient.sendTransaction({ to: REGISTRY, data, account });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx });
        return okResult(`Agent ${a.agentId} PAUSED (kill switch ON).\ntx: ${r.transactionHash}`);
      }

      case "paygate_resume": {
        const a = args as { agentId: string };
        const { encodeFunctionData } = await import("viem");
        const data = encodeFunctionData({
          abi: REGISTRY_ABI,
          functionName: "reactivate",
          args: [BigInt(a.agentId)],
        });
        const tx = await walletClient.sendTransaction({ to: REGISTRY, data, account });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx });
        return okResult(`Agent ${a.agentId} RESUMED.\ntx: ${r.transactionHash}`);
      }

      case "paygate_set_limits": {
        const a = args as { agentId: string; perCallLimit: string; perEpochLimit: string };
        const { encodeFunctionData } = await import("viem");
        const data = encodeFunctionData({
          abi: REGISTRY_ABI,
          functionName: "setLimits",
          args: [BigInt(a.agentId), BigInt(a.perCallLimit), BigInt(a.perEpochLimit)],
        });
        const tx = await walletClient.sendTransaction({ to: REGISTRY, data, account });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx });
        return okResult(`Limits updated for agent ${a.agentId}.\ntx: ${r.transactionHash}`);
      }

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return errorResult(`Tool ${name} failed: ${(e as Error).message}`);
  }
});

function okResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[paygate-mcp] connected. registry=${REGISTRY} chain=base-sepolia`);
}

main().catch((e) => {
  console.error("[paygate-mcp] fatal:", e);
  process.exit(1);
});
