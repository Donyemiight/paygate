# PayGate — Security Writeup

> Prepared for BUIDL_QUESTS 2026, co-sponsored by Halborn Security.
> Author: Donyemiight · Last updated: 2026-07-15

## Executive summary

PayGate adds an on-chain **spending policy** and **kill switch** to x402-based AI agent payments. The design assumes the agent is a hostile actor: every state transition that could cause harm requires either the human owner, the on-chain registry, or the policy contract to authorize it. The agent itself can never mutate its own policy or lift its own pause.

The contracts have not yet been professionally audited. This writeup is provided to:
1. Document the threat model and security boundaries.
2. List the explicit mitigations for the 5 known attacks on x402 (arXiv:2605.11781).
3. Identify known limitations and recommended pre-mainnet audit work.

## Threat model

### Trust assumptions

| Component | Trust level | Why |
|---|---|---|
| Base L2 | High | Inherits Ethereum L1 finality. |
| ERC-8004 Identity Registry (`0x8004A169...432`) | High | Governed by Ethereum Foundation + MetaMask + Google + Coinbase multisig. Upgradeable but with high-trust keys. |
| ERC-8004 Reputation Registry (`0x8004BAa1...b63`) | High | Same. |
| `PayGateRegistry` (this project) | High once deployed | Singleton, no upgrade path in v1. Owner is the deployer EOA. |
| `SpendingPolicy` (per agent) | High | Owned by the registry. The human only calls through the registry, never directly. |
| Agent's own wallet | **Untrusted** | Assumed hostile. This is the core premise. |
| Agent's own code / SDK | **Untrusted** | Same. |
| Human owner's wallet | Medium | If compromised, the attacker can drain the agent wallet (operational risk, not contract risk). |
| x402 facilitator | Medium | Could lie about settlement receipts. Mitigated by recording on-chain spend after a confirmed receipt. |

### What PayGate protects against

✅ Compromised SDK that tries to bypass spending limits (policy is checked by the contract, not the SDK).
✅ Compromised agent that tries to spend more than the configured per-call cap.
✅ Compromised agent that tries to spend more than the per-epoch cap.
✅ Compromised agent that tries to send to a non-allowlisted counterparty.
✅ Compromised agent that tries to ignore a kill switch (the kill switch is enforced by the contract, not the agent).
✅ Replay attacks on x402 (EIP-3009 nonces are unique per request, plus the SpendingPolicy's epoch counter caps reuse).
✅ Unverifiable agents (other agents query ERC-8004 identity + reputation before paying).

### What PayGate does NOT protect against

❌ **Compromised agent wallet that signs arbitrary transactions.** PayGate cannot prevent an agent from signing a direct USDC transfer to an attacker. The mitigation is operational: keep agent balances low, rotate wallet frequently, monitor for unexpected outbound transfers.

❌ **Compromised human owner.** If the owner's private key is compromised, the attacker can call `rotateWallet()` to a malicious address. The mitigation is operational: cold storage, hardware wallets, multisig.

❌ **Facilitator lies about settlement.** PayGate calls `recordSpend()` after the facilitator reports a settled payment. If the facilitator falsely reports success, `recordSpend()` will fail at the contract level (the on-chain state doesn't match the claimed spend). However, the agent has already done the work. The mitigation is to verify the settlement tx on BaseScan before responding 200 to the caller. The current `wrap()` implementation does this via `waitForTransactionReceipt()` in the facilitator response.

❌ **Front-running of `rotateWallet()`.** A miner could in theory front-run a wallet rotation. The mitigation is to call `rotateWallet()` atomically with the agent's next interaction, or to use a 2-step handover (propose → accept).

❌ **ERC-8004 registry upgrade.** The PayGate integration trusts the ERC-8004 registry's integrity. If the registry is maliciously upgraded, identity + reputation are compromised. This is a global risk affecting all ERC-8004 consumers, not a PayGate-specific issue.

## Mitigations for the 5 known x402 attacks

Reference: arXiv:2605.11781 *"Five Attacks on x402 Agentic Payment Protocol"*

### Attack 1: Grant-before-settle

> The server grants the client access BEFORE the on-chain settlement is confirmed. A client that receives 200 without paying has just stolen the service.

**PayGate mitigation:** The `wrap()` function calls the facilitator's `/settle` endpoint and awaits a confirmed receipt BEFORE running the handler. The handler only runs if the settlement is confirmed on-chain.

### Attack 2: Missing resource-identifier binding

> A client pays for resource A but the server hands back resource B. No on-chain link between payment and resource.

**PayGate mitigation:** The 402 payment requirements are constructed with the exact request path embedded in the `resource` field. The facilitator's `/settle` includes the resource identifier in the on-chain payment memo (where the scheme supports it; for `exact` on USDC this is implicit in the contract address).

### Attack 3: Fire-and-forget settlement

> The server claims it settled but doesn't actually call the on-chain settlement, or the call fails silently. The client paid but the service still runs.

**PayGate mitigation:** `wrap()` does NOT respond 200 to the client until the facilitator returns a confirmed on-chain settlement receipt. The `recordSpend()` call on `SpendingPolicy` is made *after* the 200, but the work has already been authorized. If the facilitator lies, the on-chain `recordSpend` will fail and the policy state will be inconsistent — this is logged loudly and the agent owner is notified via event.

### Attack 4: Missing `Cache-Control` headers

> A 402 response gets cached by an intermediate proxy, and the client never gets a chance to pay.

**PayGate mitigation:** Every 402 response includes `Cache-Control: no-store`. Every 200 response also includes `Cache-Control: no-store` because the response is dynamically priced.

### Attack 5: Replay

> A client reuses a single payment authorization to call the endpoint multiple times.

**PayGate mitigation:** EIP-3009's `transferWithAuthorization` uses a unique 32-byte nonce per authorization. The on-chain USDC contract enforces single-use of the nonce. The SpendingPolicy's epoch counter provides a second layer: even if the USDC nonce is reused (impossible in EIP-3009), the per-call and per-epoch caps cap total spend.

## Smart contract specifics

### `PayGateRegistry`

- Inherits OpenZeppelin's `Ownable(msg.sender)` and `ReentrancyGuard`.
- No upgrade path in v1. Any change requires a new contract deployment + manual migration.
- Functions: `register`, `rotateWallet`, `setMetadataURI`, `deactivate`, `reactivate`, `setLimits`, `setAllowlist`, plus view functions.
- All owner-only functions check `msg.sender == binding.humanOwner`.

### `SpendingPolicy`

- Inherits OpenZeppelin's `ReentrancyGuard`.
- Owned by the registry, NOT the human. The human calls through the registry, which acts as a policy firewall.
- Functions: `canSpend` (view), `recordSpend` (state-modifying), `setLimits`, `setAllowlist`, `setPaused`.
- Reentrancy guard on `recordSpend()`.
- All custom errors (`NotOwner`, `Paused_`, `ExceedsPerCallLimit`, `ExceedsPerEpochLimit`, `NotAllowlisted`) make failure modes explicit.

### Known contract limitations

1. **No on-chain enforcement of `metadataURI` shape.** The string is stored as-is. A malicious human could set `metadataURI = "javascript:alert(1)"` and clients rendering it naively could be vulnerable. The mitigation is for clients to validate URIs against `^(https?|ipfs)://`.

2. **`SpendingPolicy` uses `mapping(address => bool)` for allowlist, which is "open" by default.** An allowlist becomes "strict" only after the first `setAllowlist(x, true)` call. The mitigation is for the human to set an explicit allowlist during registration, not after.

3. **No event emitted for `setLimits` change of epoch.** If the human calls `setLimits()` mid-epoch, the epoch counter resets to 0. The current `SpendingPolicy.setLimits()` does emit `PolicyUpdated()` but does not log the reset. A future version should emit `EpochReset()` for observability.

4. **The `_isAllowlistStrict` boolean in `SpendingPolicy` is a contract-storage flag set on first `setAllowlist(x, true)`.** A more rigorous implementation would use a bitmap or enumerable set.

5. **No two-step `rotateWallet` handover.** A single `rotateWallet()` call changes the agent's payout address. If a malicious MEV bot front-runs the transaction, it could redirect funds to itself. A `proposeWallet()` / `acceptWallet()` two-step flow would mitigate this.

## Pre-mainnet audit recommendations

Before deploying to Base mainnet (not testnet), the following should be addressed:

1. **Two-step wallet rotation** (see Known Limitation #5).
2. **Add a `BatchedSettlement` registry function** that records multiple spend events in one tx (gas optimization + atomic consistency).
3. **Add an event for `setLimits` epoch reset** (see Known Limitation #3).
4. **Convert the allowlist to an enumerable set** (see Known Limitation #4).
5. **External audit by Halborn** (the BUIDL_QUESTS co-sponsor has offered this to finalists).
6. **Formal verification of the spending policy invariants** using Certora or similar.
7. **Fuzz testing** of the `wrap()` and `call()` flows in the SDK using Echidna or Foundry's invariant testing.

## Disclosure

If you find a security issue in PayGate, please email [your-email] with the subject `PayGate security disclosure`. We aim to respond within 48 hours.

This is a v0.1.0 implementation built in 3 weeks for BUIDL_QUESTS 2026. It has NOT been audited. Do not use on mainnet without addressing the recommendations above.
