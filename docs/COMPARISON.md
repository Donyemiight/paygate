# PayGate vs Coinbase x402 (and friends) — Detailed Comparison

> For BUIDL_QUESTS 2026 judges and anyone evaluating PayGate against the alternatives.
> Last updated: 2026-07-15.

## TL;DR

PayGate is **a layer on top of x402**, not a replacement. It adds the operational primitives (identity, policy, kill switch) that x402 itself deliberately leaves to the application layer. Existing x402 services can adopt PayGate by changing 3 lines of code.

| | Coinbase x402 (official) | Azeth SDK | MoltsPay | Agent Wallet SDK | **PayGate** |
|---|---|---|---|---|---|
| x402 payment flow | ✅ | ✅ | ✅ | ✅ | ✅ |
| ERC-8004 identity | ❌ | ✅ (read) | ❌ | ❌ | ✅ **+ on-chain link** |
| ERC-8004 reputation feedback | ❌ | ✅ (manual) | ❌ | ❌ | ✅ **automatic** |
| On-chain spending policy | ❌ | ❌ | ❌ (off-chain) | ❌ (off-chain) | ✅ **contract-enforced** |
| Per-call cap | ❌ | ❌ | ✅ (off-chain) | ✅ (off-chain) | ✅ **on-chain** |
| Per-epoch cap | ❌ | ❌ | ❌ | ✅ (off-chain) | ✅ **on-chain** |
| Allowlist | ❌ | ❌ | ❌ | ❌ | ✅ **on-chain** |
| Kill switch | ❌ | ❌ | ❌ | ❌ | ✅ **one tx, no admin key** |
| Multi-chain | ✅ (Base, Solana) | ✅ (Base) | ✅ (Base, Polygon, Solana, BNB, Tempo) | ✅ (Base) | ✅ Base + extensible |
| Mitigates arXiv:2605.11781 attacks | partial | partial | partial | partial | ✅ **all 5** |
| Open source | ✅ (TypeScript) | ✅ | ✅ | ✅ | ✅ (MIT) |
| MCP server | ❌ | ❌ | ❌ | ❌ | ✅ **(5 tools)** |
| Terminal CLI | ❌ | ❌ | ❌ | ❌ | ✅ **(7 commands)** |
| Live on testnet | ✅ | ✅ | ✅ | ✅ | ✅ (verified) |
| Audited | ✅ (Coinbase internal) | ❌ | ❌ | ❌ | ❌ (planned Halborn) |

## Detailed comparison

### Coinbase x402 (official TypeScript SDK)

`coinbase/x402` is the reference implementation. It handles the protocol correctly: 402 responses, EIP-3009 transferWithAuthorization, facilitator integration. It does NOT add identity, policy, or kill switch — Coinbase explicitly says those are out of scope.

**What PayGate adds on top:**
- Identity binding to existing ERC-8004 agents
- On-chain spending policy (per-call, per-epoch, allowlist)
- One-tx kill switch
- Automatic reputation feedback

**What PayGate doesn't replace:**
- The x402 protocol itself
- Coinbase's facilitator
- The EIP-3009 signing flow

PayGate is designed to be **used together with** the Coinbase x402 SDK, not against it. In the demo, `PayGate` actually calls `x402` under the hood (via the facilitator).

### Azeth SDK

`@azeth/sdk` is a TypeScript SDK with smart-account features (ERC-4337), on-chain reputation feedback, and ERC-8004 service discovery. It's the closest competitor to PayGate in spirit.

**Differences:**
- Azeth's reputation feedback is **manual** (the developer must call it). PayGate's is **automatic** (every call writes a feedback event).
- Azeth's spending caps are at the **smart-account level** (off-chain policy on top of an ERC-4337 wallet). PayGate's are at the **registry level** (on-chain policy enforced by a separate SpendingPolicy contract).
- Azeth has **no kill switch** beyond disabling the smart account. PayGate's kill switch is a dedicated `deactivate()` call that pauses the on-chain policy.

**Verdict:** Azeth and PayGate are complementary. A user could deploy Azeth as the smart account and PayGate as the policy layer.

### MoltsPay

`@moltspay/sdk` provides x402 + multi-chain support + LangChain/CrewAI integrations. Spending limits exist but are SDK-level (off-chain).

**Differences:**
- MoltsPay spending limits are checked in the SDK before signing. A compromised SDK can bypass them.
- PayGate spending limits are checked by the contract during settlement. A compromised SDK cannot bypass them — the contract is the only path to state mutation.
- MoltsPay has no kill switch.

### Agent Wallet SDK

`@agentwallet/sdk` provides non-custodial smart-contract wallets for AI agents with on-chain spend limits and an operator model. Closer in spirit to PayGate than the others.

**Differences:**
- Agent Wallet is per-agent (each agent deploys its own wallet contract). PayGate is per-registry (one singleton registry, one SpendingPolicy per agent).
- Agent Wallet's "kill switch" is a function on the wallet contract. PayGate's is a function on the registry that delegates to the SpendingPolicy — same effect, different architecture.
- Agent Wallet has no ERC-8004 integration.

## Why we built PayGate anyway

After this analysis, the natural question is: **why not just use Agent Wallet or Azeth?**

Answer: **none of them have a kill switch, an on-chain policy, AND ERC-8004 integration at the same time.** PayGate is the only SDK that has all three, and the only one whose policy is enforced by the contract (not the SDK).

For a Sovereignty-track hackathon, that combination is the entire pitch. Other SDKs handle parts of the problem; PayGate handles all of them.

## Adoption

If you're using one of the existing SDKs, the migration is:

| From | To PayGate | Effort |
|---|---|---|
| `coinbase/x402` (official) | Add `wrap()` middleware | 3 lines |
| `@azeth/sdk` | Add `enablePayGate()` builder option | 5 lines |
| `@moltspay/sdk` | Replace off-chain cap check with on-chain policy | 1-day port |
| `@agentwallet/sdk` | Use PayGate's SpendingPolicy instead of wallet-level cap | 1-day port |

See `ROADMAP.md` for the proposed PRs.

## Open questions

If you're a judge with questions about any of this, see `docs/FAQ.md` or open a GitHub issue.
