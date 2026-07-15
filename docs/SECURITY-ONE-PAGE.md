---
title: "PayGate — Security One-Pager"
author: "O.A Dolapo"
date: "2026-07-15"
geometry: margin=0.75in
fontsize: 9pt
---

# PayGate — Security One-Pager

**Project:** PayGate · Sovereign payment + identity layer for AI agents
**Track:** BUIDL_QUESTS 2026 — Sovereignty
**Contract:** `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` on Base Sepolia
**Status:** v0.1.0, not yet audited. Pre-mainnet recommendations in `docs/SECURITY.md`.

## What PayGate is

x402 (Coinbase, May 2025) lets AI agents pay each other USDC over HTTP. PayGate is an x402 wrapper that adds three primitives x402 doesn't have: **on-chain identity** (ERC-8004), **on-chain spending policy**, and a **one-transaction kill switch**.

## Threat model (one-line each)

- **Compromised agent wallet** — assumed hostile. PayGate enforces caps at the *contract* level, not the SDK.
- **Compromised agent SDK** — same. Policy is `SpendingPolicy.recordSpend()` reverting on cap violation.
- **Compromised human owner** — operational risk (rotate wallet, cold storage). Out of contract scope.
- **x402 facilitator lies about settlement** — `wrap()` awaits on-chain receipt before running handler.

## Mitigations for the 5 known x402 attacks (arXiv:2605.11781)

| # | Attack | PayGate mitigation |
|---|---|---|
| 1 | Grant-before-settle | Settle via facilitator, await on-chain receipt, *then* run handler. |
| 2 | Missing resource-identifier binding | 402 `resource` field is the request path; EIP-3009 authorization is path-bound. |
| 3 | Fire-and-forget settlement | Synchronous `/settle` + `waitForTransactionReceipt`. 200 not sent until confirmed. |
| 4 | Missing `Cache-Control` | Every 402 and 200 includes `Cache-Control: no-store`. |
| 5 | Replay | EIP-3009 single-use nonce + SpendingPolicy epoch counter + per-call cap. |

## Smart contract security controls

- **OpenZeppelin 5.x `Ownable(msg.sender)`** — explicit initial-owner pattern (no silent ownership).
- **`ReentrancyGuard`** on all state-modifying functions in both contracts.
- **Custom errors** (`NotOwner`, `Paused_`, `ExceedsPerCallLimit`, `ExceedsPerEpochLimit`, `NotAllowlisted`, `AlreadyRegistered`, `InvalidWallet`, `NotAgentOwner`, `AgentNotFound`) — every revert path is named, not a string.
- **All state-changing owner functions are `onlyAgentOwner`-gated** — a random address cannot pause someone else's agent.
- **Per-agent `SpendingPolicy`** — the policy is a separate contract, owned by the registry, not the human. The human calls `registry.setLimits()`, which forwards. This separates the "kill switch caller" from the "policy owner" so a compromised human cannot accidentally lock themselves out.
- **Tested:** 13/13 Hardhat tests pass, covering register, double-register rejection, zero-wallet rejection, wallet rotation ownership, deactivate/reactivate cycle, all `canSpend` branches, all `recordSpend` revert paths, and the v2 strict-allowlist fix.
- **End-to-end smoke test on Base Sepolia:** 7/7 checks pass (register, binding, caps, kill switch, etc).
- **Deployed and verified live:** `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` on Base Sepolia (chain ID 84532).

## What's NOT yet protected (acknowledged in SECURITY.md)

1. No two-step `rotateWallet` handover — front-running possible. Planned for v0.2.
2. Allowlist is `mapping + bool flag`, not enumerable.
3. No formal verification or external audit yet.
4. No batched settlement (multi-spend in one tx).
5. Compromise of the human owner's key is operational risk, not contract risk.

## Pre-mainnet audit recommendations

1. Two-step wallet rotation (mitigates front-running).
2. Add `EpochReset` event for `setLimits` (observability).
3. Replace single-bool `_allowlistStrict` with enumerable set.
4. External audit by Halborn (the BUIDL_QUESTS co-sponsor) — targeted for post-hackathon.
5. Formal verification of the spending-policy invariants (Certora or similar).
6. Fuzz testing of `wrap()` and `call()` flows (Echidna / Foundry invariant testing).

## Disclosure

Security issues: open a GitHub issue at https://github.com/Donyemiight/paygate/issues with the label `security`. Response within 48 hours.

## TL;DR

PayGate turns x402 from "agents can pay each other" into "agents can pay each other, the human stays in control, and a compromised agent can be paused in 1 transaction." The contract is small (2 files, ~250 LOC), tested, and live. Full threat model + audit recommendations in `docs/SECURITY.md`.
