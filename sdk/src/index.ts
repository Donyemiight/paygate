/**
 * PayGate SDK — main entry
 *
 * Wrap any AI agent with:
 *   - ERC-8004 on-chain identity (Base)
 *   - x402-native payment acceptance (Base, USDC)
 *   - On-chain spending policy (per-call cap, per-epoch cap, allowlist)
 *   - Human-controlled kill switch
 *   - On-chain reputation feedback after every call
 *
 * Three high-level helpers:
 *   - wrap(): convert a plain function into a PayGate-protected agent
 *   - call():  make an x402 payment to another PayGate agent
 *   - register(): one-time on-chain registration of the agent
 */

export { wrap } from "./wrap.js";
export { call } from "./call.js";
export { register } from "./register.js";
export { getAgentIdentity, getAgentReputation, encodeSubmitFeedback, ERC8004_BASE } from "./erc8004.js";
export type {
  PayGateConfig,
  AgentRegistration,
  WrappedHandler,
  CallOptions,
  CallResult,
  Reputation,
} from "./types.js";
export type { AgentIdentity, AgentReputation } from "./erc8004.js";
export { PayGateError, PolicyViolationError } from "./errors.js";
