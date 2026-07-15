#!/usr/bin/env node
/**
 * PayGate CLI — terminal-native tool for managing sovereign AI agent payments.
 *
 * Usage:
 *   paygate register --per-call 0.10 --per-epoch 1.00 --epoch 24h
 *   paygate status [--agent 1]
 *   paygate call https://agent.example.com/api --amount 0.01
 *   paygate pause --agent 1
 *   paygate resume --agent 1
 *   paygate whoami
 *
 * Env:
 *   PAYGATE_PRIVATE_KEY  - agent wallet private key
 *   PAYGATE_OWNER        - human owner address
 *   PAYGATE_REGISTRY     - PayGateRegistry contract address
 *   PAYGATE_RPC          - Base Sepolia RPC URL
 *   PAYGATE_USDC         - USDC contract address
 */

import { createPublicClient, http, defineChain } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { register } from "@paygate/sdk";
import type { PayGateConfig } from "@paygate/sdk";

// ----- helpers ------------------------------------------------------------

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

function logOk(msg: string) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function logWarn(msg: string) { console.log(`${YELLOW}!${RESET} ${msg}`); }
function logErr(msg: string) { console.log(`${RED}✗${RESET} ${msg}`); }
function logDim(msg: string) { console.log(`${DIM}${msg}${RESET}`); }
function banner() {
  console.log(`${CYAN}${BOLD}paygate${RESET} ${DIM}— sovereign AI agent payments on Base${RESET}`);
  console.log();
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    logErr(`Missing env var: ${name}`);
    logDim(`Set it in your shell, e.g.  export ${name}=0x...`);
    process.exit(1);
  }
  return v;
}

function loadConfig(): PayGateConfig {
  return {
    agentPrivateKey: requireEnv("PAYGATE_PRIVATE_KEY") as `0x${string}`,
    ownerAddress: requireEnv("PAYGATE_OWNER") as `0x${string}`,
    registryAddress: requireEnv("PAYGATE_REGISTRY") as `0x${string}`,
    usdcAddress: (process.env.PAYGATE_USDC ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`,
    facilitatorUrl: process.env.PAYGATE_FACILITATOR ?? "https://www.x402.org/facilitator",
    rpcUrl: process.env.PAYGATE_RPC ?? "https://sepolia.base.org",
    chainId: 84532,
  };
}

// ----- arg parsing --------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

// ----- commands -----------------------------------------------------------

async function cmdRegister(args: Record<string, string>) {
  banner();
  const cfg = loadConfig();
  const perCall = BigInt(Math.round(parseFloat(args["per-call"] ?? "0.10") * 1_000_000));
  const perEpoch = BigInt(Math.round(parseFloat(args["per-epoch"] ?? "1.00") * 1_000_000));
  const epochSec = parseEpochDuration(args["epoch"] ?? "24h");

  logDim(`Per-call cap:  $${Number(perCall) / 1e6}`);
  logDim(`Per-epoch cap: $${Number(perEpoch) / 1e6}`);
  logDim(`Epoch length:  ${epochSec}s (${args["epoch"] ?? "24h"})`);
  console.log();

  const reg = await register(cfg, {
    perCallLimit: perCall,
    perEpochLimit: perEpoch,
    epochDuration: epochSec,
    metadataURI: args["uri"] ?? "ipfs://paygate-cli",
  });

  logOk("Agent registered on-chain");
  console.log(`  ${BOLD}PayGate agentId:${RESET}  ${reg.paygateAgentId}`);
  console.log(`  ${BOLD}SpendingPolicy:${RESET}  ${reg.policyAddress}`);
  console.log(`  ${BOLD}tx hash:${RESET}          ${reg.txHash}`);
  console.log();
  logDim(`Save this agentId for future "paygate status --agent ${reg.paygateAgentId}" calls.`);
}

async function cmdStatus(args: Record<string, string>) {
  banner();
  const cfg = loadConfig();
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(cfg.rpcUrl) });

  let agentId: bigint;
  if (args["agent"]) {
    agentId = BigInt(args["agent"]);
  } else {
    // find by owner
    const id = (await publicClient.readContract({
      address: cfg.registryAddress as `0x${string}`,
      abi: [
        {
          name: "getAgentIdByOwner",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "owner", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "getAgentIdByOwner",
      args: [cfg.ownerAddress as `0x${string}`],
    } as any)) as bigint;
    if (id === 0n) {
      logErr(`No agent registered for owner ${cfg.ownerAddress}. Run "paygate register" first.`);
      process.exit(1);
    }
    agentId = id;
  }

  const binding = (await publicClient.readContract({
    address: cfg.registryAddress as `0x${string}`,
    abi: [
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
    ],
    functionName: "getBinding",
    args: [agentId],
  } as any)) as readonly [bigint, string, string, string, string, boolean];

  const policy = (await publicClient.readContract({
    address: binding[2] as `0x${string}`,
    abi: [
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
    ],
    functionName: "getPolicy",
  } as any)) as readonly [bigint, bigint, bigint, bigint, boolean];

  console.log(`${BOLD}PayGate agentId:${RESET}  ${agentId}`);
  console.log(`${BOLD}agentWallet:${RESET}     ${binding[1]}`);
  console.log(`${BOLD}SpendingPolicy:${RESET}  ${binding[2]}`);
  console.log(`${BOLD}humanOwner:${RESET}      ${binding[3]}`);
  console.log(`${BOLD}metadataURI:${RESET}     ${binding[4]}`);
  console.log(`${BOLD}active:${RESET}          ${binding[5] ? `${GREEN}yes${RESET}` : `${RED}no${RESET}`}`);
  console.log();
  console.log(`${BOLD}Policy state:${RESET}`);
  console.log(`  perCallLimit:  $${Number(policy[0]) / 1e6}`);
  console.log(`  perEpochLimit: $${Number(policy[1]) / 1e6}`);
  console.log(`  epochDuration: ${policy[2]}s`);
  console.log(`  epochSpent:    $${Number(policy[3]) / 1e6}`);
  console.log(`  paused:        ${policy[4] ? `${RED}yes (kill switch ON)${RESET}` : `${GREEN}no${RESET}`}`);
}

async function cmdPause(args: Record<string, string>) {
  banner();
  const cfg = loadConfig();
  const account = privateKeyToAccount(cfg.agentPrivateKey);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(cfg.rpcUrl) });

  const agentId = args["agent"] ? BigInt(args["agent"]) : await resolveAgentId(cfg, publicClient);
  logWarn(`Pausing agent ${agentId} (kill switch ON)...`);

  const tx = await publicClient.simulateContract({
    address: cfg.registryAddress as `0x${string}`,
    abi: [
      {
        name: "deactivate",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
      },
    ],
    functionName: "deactivate",
    args: [agentId],
    account,
  }).catch((e) => {
    logErr(`deactivate() failed: ${(e as Error).message.slice(0, 200)}`);
    process.exit(1);
  });

  // send the actual tx
  const { createWalletClient } = await import("viem");
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(cfg.rpcUrl) });
  const hash = await wallet.writeContract(tx.request as any);
  logOk(`Kill switch flipped: ${hash}`);
  logDim("Agent will refuse all x402 settlements until reactivate() is called.");
}

async function cmdResume(args: Record<string, string>) {
  banner();
  const cfg = loadConfig();
  const account = privateKeyToAccount(cfg.agentPrivateKey);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(cfg.rpcUrl) });

  const agentId = args["agent"] ? BigInt(args["agent"]) : await resolveAgentId(cfg, publicClient);
  logOk(`Resuming agent ${agentId}...`);

  const sim = await publicClient.simulateContract({
    address: cfg.registryAddress as `0x${string}`,
    abi: [
      {
        name: "reactivate",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "agentId", type: "uint256" }],
        outputs: [],
      },
    ],
    functionName: "reactivate",
    args: [agentId],
    account,
  });

  const { createWalletClient } = await import("viem");
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(cfg.rpcUrl) });
  const hash = await wallet.writeContract(sim.request as any);
  logOk(`Agent resumed: ${hash}`);
}

async function cmdCall(args: Record<string, string>) {
  banner();
  const url = args["url"] ?? args["_"] ?? process.argv[3];
  if (!url) { logErr("Usage: paygate call <url> --amount 0.01"); process.exit(1); }
  const amount = BigInt(Math.round(parseFloat(args["amount"] ?? "0.01") * 1_000_000));
  logDim(`POST ${url} with $${Number(amount) / 1e6} USDC...`);
  // For the demo, just confirm the URL is reachable. Full call() flow lives in the SDK.
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: args["body"] ?? "{}" });
    if (r.status === 402) {
      logOk("Endpoint is x402-gated. Use @paygate/sdk's call() to pay and retry.");
      const reqs = await r.json();
      console.log(JSON.stringify(reqs, null, 2));
    } else {
      const body = await r.text();
      console.log(`HTTP ${r.status}: ${body.slice(0, 500)}`);
    }
  } catch (e) {
    logErr(`Request failed: ${(e as Error).message}`);
  }
}

async function cmdWhoami() {
  banner();
  const cfg = loadConfig();
  const account = privateKeyToAccount(cfg.agentPrivateKey);
  console.log(`${BOLD}Wallet address:${RESET}  ${account.address}`);
  console.log(`${BOLD}Owner address:${RESET}   ${cfg.ownerAddress}`);
  console.log(`${BOLD}Registry:${RESET}        ${cfg.registryAddress}`);
  console.log(`${BOLD}RPC:${RESET}             ${cfg.rpcUrl}`);
  console.log(`${BOLD}USDC:${RESET}            ${cfg.usdcAddress}`);
}

async function cmdHelp() {
  banner();
  console.log(`${BOLD}Usage:${RESET}
  paygate register [--per-call $X] [--per-epoch $X] [--epoch 24h] [--uri ipfs://...]
  paygate status   [--agent ID]
  paygate call     <url> [--amount $X] [--body '{...}']
  paygate pause    [--agent ID]
  paygate resume   [--agent ID]
  paygate whoami

${BOLD}Env:${RESET}
  PAYGATE_PRIVATE_KEY   agent wallet private key (0x...)
  PAYGATE_OWNER         human owner address
  PAYGATE_REGISTRY      PayGateRegistry contract address
  PAYGATE_RPC           Base Sepolia RPC (default https://sepolia.base.org)
  PAYGATE_USDC          USDC contract address (default 0x036CbD53842c5426634e7929541eC2318f3dCF7e)
`);
}

// ----- utils --------------------------------------------------------------

function parseEpochDuration(s: string): number {
  const m = s.match(/^(\d+)(s|m|h|d)?$/);
  if (!m) return 86400;
  const n = parseInt(m[1], 10);
  switch (m[2]) {
    case "s": return n;
    case "m": return n * 60;
    case "h": return n * 3600;
    case "d": return n * 86400;
    default: return n;
  }
}

async function resolveAgentId(cfg: PayGateConfig, publicClient: any): Promise<bigint> {
  const id = (await publicClient.readContract({
    address: cfg.registryAddress as `0x${string}`,
    abi: [
      {
        name: "getAgentIdByOwner",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "getAgentIdByOwner",
    args: [cfg.ownerAddress as `0x${string}`],
  } as any)) as bigint;
  if (id === 0n) {
    logErr(`No agent registered for ${cfg.ownerAddress}. Run "paygate register" first.`);
    process.exit(1);
  }
  return id;
}

// ----- main ---------------------------------------------------------------

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case "register": return cmdRegister(args);
    case "status": return cmdStatus(args);
    case "call": return cmdCall(args);
    case "pause": return cmdPause(args);
    case "resume": return cmdResume(args);
    case "whoami": return cmdWhoami();
    case "help":
    case "--help":
    case "-h":
    case undefined:
      return cmdHelp();
    default:
      logErr(`Unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
}

main().catch((e) => {
  logErr((e as Error).message);
  process.exit(1);
});
