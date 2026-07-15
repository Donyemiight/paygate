/**
 * PayGate SDK error types.
 *
 * Distinguishes:
 *   - PayGateError: top-level wrapper, includes a code + cause.
 *   - PolicyViolationError: spend was blocked by the SpendingPolicy.
 *   - IdentityError: ERC-8004 identity binding is missing or invalid.
 *   - SettlementError: x402 settlement failed (facilitator rejected, etc).
 */

export class PayGateError extends Error {
  readonly code: string;
  readonly cause?: unknown;
  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "PayGateError";
    this.code = code;
    this.cause = cause;
  }
}

export class PolicyViolationError extends PayGateError {
  readonly reason: "paused" | "per-call-cap" | "per-epoch-cap" | "not-allowlisted";
  constructor(reason: PolicyViolationError["reason"], message: string) {
    super("POLICY_VIOLATION", message);
    this.name = "PolicyViolationError";
    this.reason = reason;
  }
}

export class IdentityError extends PayGateError {
  constructor(message: string) {
    super("IDENTITY_ERROR", message);
    this.name = "IdentityError";
  }
}

export class SettlementError extends PayGateError {
  constructor(message: string, cause?: unknown) {
    super("SETTLEMENT_ERROR", message, cause);
    this.name = "SettlementError";
  }
}
