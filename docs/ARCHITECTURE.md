# PayGate — Architecture Deep-Dive

## Why three contracts, not one?

**`PayGateRegistry`** is a singleton. Every PayGate agent in the world reads from it. It's the canonical "directory" of PayGate agents. Cheap to deploy once, gas-cheap to read forever.

**`SpendingPolicy`** is per-agent. Each agent gets its own instance. This matters because:
- The owner can mutate *their* policy without affecting anyone else.
- Gas: reading policy state for one agent doesn't touch any other agent's storage.
- Failure isolation: a bug in one agent's policy doesn't cascade.

**`ERC-8004 Identity / Reputation`** are external (already deployed on Base). PayGate is a *consumer* of these, not a re-implementer. We're not competing with ERC-8004 — we're using it correctly.

## Why on-chain policy, not SDK-level policy?

Most x402 SDKs that have a "spending limit" feature (MoltsPay, Azeth) implement it in TypeScript inside the SDK. The policy is checked before the x402 payment is signed.

That has two failure modes:

1. **Compromised SDK** — if the agent's runtime is compromised (e.g. prompt injection, malicious dependency), the SDK-level check is bypassed trivially. The agent just signs the payment without checking.

2. **Compromised agent wallet** — the policy lives in the same process as the wallet. A compromised agent has both.

PayGate moves the policy check **into the SettlementPolicy contract**. The x402 settlement calls `recordSpend(amount, counterparty)`, which reverts if the policy is violated. Even a fully compromised agent cannot bypass it — the contract is the only thing that can update on-chain state, and the facilitator checks the call before settling.

This is the **"Smart account, not SDK"** pattern that account abstraction pioneered. PayGate applies it to the agent-payment problem.

## Why ERC-8004 and not a new identity?

ERC-8004 is **already** the de facto standard (co-authored by MetaMask, Ethereum Foundation, Google, Coinbase). 17,600+ agents are already registered on Base. Inventing a parallel identity registry would:
- split the agent ecosystem,
- force agents to register twice,
- make PayGate useless to anyone not using our custom identity.

Instead PayGate:
- **accepts** any existing ERC-8004 `agentId` at registration time,
- **links** the PayGate `agentId` to the ERC-8004 `agentId` in storage,
- **writes reputation feedback** to the canonical ERC-8004 Reputation Registry, not our own.

This makes PayGate a *composition* layer on top of the existing standard. It works for the 17,600+ existing agents, not just the ones that start fresh on PayGate.

## What does the kill switch actually do?

When the owner calls `registry.deactivate(agentId)`:

1. `bindings[agentId].active = false` — registry no longer recognizes the agent as live.
2. `SpendingPolicy(policy).setPaused(true)` — the on-chain policy refuses all spends.
3. From the next x402 call onward, the settlement reverts on `recordSpend()`. The agent cannot accept payment.
4. The agent's *read-side* endpoints (e.g. a free discovery API) can also check `registry.getBinding(agentId).active` and reject calls.

There is **no admin key** that can override the kill switch. The owner can re-enable via `reactivate()`, but no third party can. This is the same model as a hardware wallet's "lock device" — the user's authority is absolute.

## What's the security model?

### Trust assumptions
- The Base L2 is honest (inherits Ethereum L1 security).
- The ERC-8004 registry contracts are honest (they're upgradeable but governed by the Ethereum Foundation + Coinbase + MetaMask + Google — high-trust multisig).
- The agent's private key is not compromised (PayGate does not solve key management).
- The human owner's private key is not compromised (they can rotate the wallet via `rotateWallet()`).

### What PayGate does NOT protect against
- A compromised agent wallet. PayGate cannot prevent the agent from signing a transaction; it can only prevent the *settlement* from succeeding. If the agent signs a direct USDC transfer to an attacker, PayGate cannot block that. The mitigation is to keep agent balances low + use spending policy.
- A compromised human owner. The owner can rotate the agent wallet to a malicious one. The mitigation is operational (cold storage, multisig).
- Facilitator compromise. PayGate uses the public x402 facilitator (`https://www.x402.org/facilitator` for Sepolia). If the facilitator lies about settlement, PayGate's `recordSpend()` call will fail (no on-chain receipt) and the spend won't be recorded.

### What PayGate DOES protect against
- ✅ Compromised SDK that tries to bypass spending limits
- ✅ Compromised agent that tries to spend more than allowed
- ✅ Compromised agent that tries to send to a non-allowlisted counterparty
- ✅ Compromised agent that refuses to obey a pause command (it's enforced by the contract, not the agent)
- ✅ Replay attacks on x402 payments (EIP-3009 nonces + epoch counter)
- ✅ Unverifiable agents (other agents can query ERC-8004 identity + reputation before paying)
