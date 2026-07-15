/**
 * Shared types for the PayGate SDK.
 */

import type { Address, Hash, Hex } from "viem";

/** PayGate configuration. Either pass the full config, or use process.env lookups via {@link loadConfig}. */
export interface PayGateConfig {
  /** Agent's payout wallet private key (hex, 0x-prefixed). This is the wallet that holds USDC. */
  agentPrivateKey: Hex;
  /** Human owner's address (can rotate wallet, set limits, pause). */
  ownerAddress: Address;
  /** PayGateRegistry contract address (Base mainnet or Sepolia). */
  registryAddress: Address;
  /** USDC contract address (Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913). */
  usdcAddress: Address;
  /** x402 facilitator URL. Use https://www.x402.org/facilitator for Base Sepolia. */
  facilitatorUrl: string;
  /** Base RPC URL. */
  rpcUrl: string;
  /** Chain ID: 8453 (Base mainnet) or 84532 (Base Sepolia). */
  chainId: 8453 | 84532;
  /** Optional: existing ERC-8004 agentId, if already registered upstream. */
  erc8004AgentId?: bigint;
  /** Optional: metadata URI (ipfs:// or https://) for the agent's registration file. */
  metadataURI?: string;
}

/** Result of register(). */
export interface AgentRegistration {
  /** PayGate's local agentId (assigned by the registry). */
  paygateAgentId: bigint;
  /** Address of the per-agent SpendingPolicy contract. */
  policyAddress: Address;
  /** Transaction hash of the registration tx. */
  txHash: Hash;
}

/** A handler that the caller wants to wrap. */
export type Handler<Input, Output> = (input: Input) => Promise<Output> | Output;

/** What wrap() returns. An Express/Next/http compatible handler that gates with x402. */
export interface WrappedHandler<Input = unknown, Output = unknown> {
  /** Express-style (req, res) handler. */
  (req: { body: Input; method: string; headers: Record<string, string> }, res: {
    status: (code: number) => any;
    json: (body: any) => any;
    setHeader: (k: string, v: string) => void;
  }): Promise<void>;
  /** Underlying handler, exposed for testing. */
  _handler: Handler<Input, Output>;
  /** PayGate config, exposed for testing. */
  _config: PayGateConfig;
  /** PayGate agentId. */
  _agentId: bigint;
}

/** Options for call(). */
export interface CallOptions {
  /** USDC amount in 6-decimal base units (e.g. 10000n = $0.01). */
  amount: bigint;
  /** Optional human-readable description (shown in 402 receipt). */
  description?: string;
  /** Optional request body (will be POSTed to the agent endpoint). */
  body?: unknown;
  /** Optional timeout in ms (default 30s). */
  timeoutMs?: number;
}

/** Result of call(). */
export interface CallResult<T = unknown> {
  /** HTTP status of the final (paid) response. */
  status: number;
  /** Parsed response body. */
  data: T;
  /** x402 settlement receipt (transaction hash on Base). */
  settlementTx?: Hash;
  /** Reputation feedback tx (if auto-feedback was enabled). */
  reputationTx?: Hash;
}

/** Reputation summary read from the ERC-8004 Reputation Registry. */
export interface Reputation {
  agentId: bigint;
  count: bigint;
  /** Average score (0-100), 18-decimal fixed point. 0n if no feedback yet. */
  averageScore: bigint;
}
