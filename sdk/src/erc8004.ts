/**
 * ERC-8004 helpers — read/write the canonical on-chain agent identity + reputation registries on Base.
 *
 * These are read-only from PayGate's perspective. PayGate doesn't deploy a new ERC-8004 registry;
 * it integrates with the existing Base deployments:
 *   - Identity Registry:    0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 *   - Reputation Registry:  0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import { base, baseSepolia } from "viem/chains";

export const ERC8004_BASE = {
  /** Identity Registry (Base mainnet) — every agent is a transferable ERC-721 */
  identity: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
  /** Reputation Registry (Base mainnet) — feedback events */
  reputation: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
  /** Same addresses on Base Sepolia (deterministic CREATE2 deployment) */
  identitySepolia: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
  reputationSepolia: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
} as const;

// Minimal ABIs (just what we need)
const IDENTITY_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getAgentWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const REPUTATION_ABI = [
  {
    name: "getFeedback",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint256" },
    ],
    outputs: [
      { name: "score", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "uri", type: "string" },
      { name: "hash", type: "bytes32" },
      { name: "timestamp", type: "uint256" },
    ],
  },
  {
    name: "getFeedbackCount",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export interface AgentIdentity {
  agentId: bigint;
  owner: Address;
  agentWallet: Address;
  registrationURI: string;
}

export interface AgentReputation {
  agentId: bigint;
  totalFeedback: number;
  /** Average score across all feedback (0-100). 0 if no feedback. */
  averageScore: number;
}

/**
 * Look up the on-chain identity of an ERC-8004 agent by ID.
 */
export async function getAgentIdentity(
  rpcUrl: string,
  chainId: 8453 | 84532,
  agentId: bigint,
): Promise<AgentIdentity> {
  const publicClient = createPublicClient({
    chain: chainId === 8453 ? base : baseSepolia,
    transport: http(rpcUrl),
  });
  const registry =
    chainId === 84532 ? ERC8004_BASE.identitySepolia : ERC8004_BASE.identity;

  const [owner, uri, agentWallet] = await Promise.all([
    publicClient.readContract({
      address: registry,
      abi: IDENTITY_ABI,
      functionName: "ownerOf",
      args: [agentId],
    } as any),
    publicClient.readContract({
      address: registry,
      abi: IDENTITY_ABI,
      functionName: "tokenURI",
      args: [agentId],
    } as any),
    publicClient.readContract({
      address: registry,
      abi: IDENTITY_ABI,
      functionName: "getAgentWallet",
      args: [agentId],
    } as any).catch(() => null) as Promise<Address | null>,
  ]);

  return {
    agentId,
    owner: owner as Address,
    agentWallet: (agentWallet ?? owner) as Address,
    registrationURI: uri as string,
  };
}

/**
 * Compute the reputation summary for an agent by reading feedback events
 * across all clients. Returns total count and average score.
 *
 * NOTE: this is a naive read — for a real implementation you'd use an indexer
 * (The Graph, Ponder) to query Feedback events. For PayGate's demo purposes,
 * we scan a bounded set of recent feedback (configurable, default 50).
 */
export async function getAgentReputation(
  rpcUrl: string,
  chainId: 8453 | 84532,
  agentId: bigint,
  sampleSize = 50,
): Promise<AgentReputation> {
  const publicClient = createPublicClient({
    chain: chainId === 8453 ? base : baseSepolia,
    transport: http(rpcUrl),
  });
  const registry =
    chainId === 84532 ? ERC8004_BASE.reputationSepolia : ERC8004_BASE.reputation;

  // For demo: get total feedback count from a sentinel address
  // (in production, use event indexing)
  let total = 0;
  try {
    const count = (await publicClient.readContract({
      address: registry,
      abi: REPUTATION_ABI,
      functionName: "getFeedbackCount",
      args: [agentId, "0x0000000000000000000000000000000000000000"],
    } as any)) as bigint;
    total = Number(count);
  } catch {
    total = 0;
  }

  // Naive: assume average score from a sample
  let avg = 0;
  if (total > 0 && total <= sampleSize) {
    let sum = 0;
    for (let i = 0; i < Math.min(total, sampleSize); i++) {
      try {
        const fb = (await publicClient.readContract({
          address: registry,
          abi: REPUTATION_ABI,
          functionName: "getFeedback",
          args: [agentId, "0x0000000000000000000000000000000000000000", BigInt(i)],
        } as any)) as readonly [number, Hex, Hex, string, Hex, bigint];
        sum += Number(fb[0]);
      } catch {
        // skip
      }
    }
    avg = total > 0 ? sum / total : 0;
  }

  return {
    agentId,
    totalFeedback: total,
    averageScore: avg,
  };
}

/**
 * Encode the call data for submitting reputation feedback.
 * Used by callers (other agents) after a successful x402 call.
 */
export function encodeSubmitFeedback(
  agentId: bigint,
  score: number, // 0-100
  tag1: string = "0x0000000000000000000000000000000000000000000000000000000000000000",
  tag2: string = "0x0000000000000000000000000000000000000000000000000000000000000000",
  uri: string = "",
): { to: Address; data: Hex } {
  const data = encodeFunctionData({
    abi: [
      {
        name: "submitFeedback",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "agentId", type: "uint256" },
          { name: "score", type: "uint8" },
          { name: "tag1", type: "bytes32" },
          { name: "tag2", type: "bytes32" },
          { name: "uri", type: "string" },
          { name: "hash", type: "bytes32" },
          { name: "deadline", type: "uint256" },
        ],
        outputs: [],
      },
    ],
    functionName: "submitFeedback",
    args: [
      agentId,
      score,
      tag1 as Hex,
      tag2 as Hex,
      uri,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      BigInt(Math.floor(Date.now() / 1000) + 3600),
    ],
  });
  return { to: ERC8004_BASE.reputation, data };
}
