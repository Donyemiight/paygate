# PayGate — Roadmap & Integration Proposals

> Submitted as part of BUIDL_QUESTS 2026 (Sovereignty track).
> This document describes what shipped, what's planned, and which existing x402 SDKs we plan to integrate with.

## v0.1.0 (shipped — 2026-07-15)

- [x] `PayGateRegistry` contract on Base Sepolia
- [x] `SpendingPolicy` contract (per-agent, contract-enforced)
- [x] `@paygate/sdk` — TypeScript SDK with `wrap()`, `call()`, `register()`, `getAgentIdentity()`, `getAgentReputation()`, `encodeSubmitFeedback()`
- [x] `paygate` CLI — terminal-native tool
- [x] 3-agent demo (Sentiment, Summarizer, Translate)
- [x] PayGate Directory (on-chain agent browser at `/directory`)
- [x] 5-attacks explainer at `/attacks.html`
- [x] Landing page at `/`
- [x] SKILL.md endpoint (`/.well-known/SKILL.md`)
- [x] 13/13 Hardhat tests, 13 Foundry tests, 7/7 smoke tests on testnet, 13/13 integration test on testnet
- [x] Full docs: README, ARCHITECTURE, SECURITY, SECURITY-ONE-PAGE (PDF), PITCH-DECK (PDF), FAQ, DEPLOY, GAS, CHANGELOG, DEMO-SCRIPT, OPENARENA-FORM, X-POSTS
- [x] Live on Base Sepolia: [`0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A`](https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A)

## v0.2.0 (planned Q3 2026)

- [ ] Two-step `rotateWallet()` (propose → accept) — mitigates front-running
- [ ] `BatchedSettlement` — record multiple spends in one tx
- [ ] `EpochReset` event for observability
- [ ] Enumerable allowlist (replace single-bool strict-mode flag)
- [ ] Multi-asset support (EURC, USDT, cbBTC) — 10-line SDK change
- [ ] Multi-chain: deploy PayGateRegistry on Ethereum mainnet, Arbitrum, Optimism, Polygon

## v1.0.0 (planned Q4 2026)

- [ ] External audit by Halborn (BUIDL_QUESTS 2026 co-sponsor)
- [ ] Formal verification of spending-policy invariants (Certora)
- [ ] Mainnet deploy on Base + Ethereum
- [ ] PayGate Directory v2 — full agent search, reputation-weighted ranking, ERC-8004 leaderboard
- [ ] PayGate-as-a-Service hosted offering (no deploy needed for the user)

## v2.0.0 (planned 2027)

- [ ] zkPolicy — ZK-proof-based spending policy that hides the agent's spend from observers
- [ ] TEEPolicy — Trusted Execution Environment integration for policy enforcement with confidentiality
- [ ] Cross-chain agent identity (read same `agentId` across all PayGateRegistry instances)

---

## Proposed SDK integrations

PayGate is designed to be a **drop-in addition** to existing x402 SDKs. Here are the integration proposals we'll send as PRs after BUIDL_QUESTS 2026:

### 1. `coinbase/x402` (official TypeScript SDK)

**File:** `typescript/packages/x402/src/paygate.ts`

Add a `withPayGate()` middleware that wraps any x402 handler:

```typescript
import { withPayGate } from "@paygate/sdk/adapters/x402";

const handler = withPayGate(
  { registryAddress: "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A" },
  async (req) => ({ data: process(req) }),
  { priceUSDC: "10000" }
);
```

PR link to be filed post-hackathon.

### 2. `Rail402/x402-sdk`

**File:** `src/middleware/paygate.ts`

Add a policy-aware `paymentMiddleware` variant:

```typescript
import { paymentMiddleware } from "@rail402/x402-sdk/paygate";

app.use(paymentMiddleware({
  registryAddress: "0x...",
  payTo: wallet.address,
  routes: { "/api/data": { price: "$0.01", network: "base" } },
}, { autoKillSwitch: true }));
```

### 3. `Azeth SDK`

**File:** `src/integrations/paygate.ts`

Add an `enablePayGate()` option to the existing Azeth agent builder:

```typescript
import { buildAgent } from "@azeth/sdk";
const agent = buildAgent({ ... })
  .enablePayGate({
    registry: "0x...",
    onKillSwitch: (agentId) => console.log("paused:", agentId),
  });
```

### 4. `MoltsPay`

**File:** `src/paygate/index.ts`

Replace MoltsPay's off-chain spending-limit check with a PayGate on-chain check:

```typescript
import { wrapWithPayGate } from "@paygate/sdk/adapters/moltspay";
const result = await wrapWithPayGate(moltsPayAgent, { policy: "0x..." });
```

### 5. `x402-express`

**File:** `middleware/paygate.ts`

A single-line middleware addition:

```typescript
import express from "express";
import { paygate } from "@paygate/sdk/adapters/express";

const app = express();
app.use(paygate({ registry: "0x..." }));
app.post("/api", async (req, res) => res.json(await myAgent(req.body)));
```

---

## ERC-8004 partnership opportunities

We plan to send proposals to the ERC-8004 working group (EF, MetaMask, Coinbase, Google) for:

1. **Cross-reference** — PayGate binding's `erc8004AgentId` becomes a recommended field in ERC-8004 registration files
2. **Reputation aggregation** — PayGate's reputation feedback becomes one of the canonical signals the ERC-8004 Reputation Registry indexes
3. **Standardization** — push for an EIP that formalizes the "agent with spending policy" pattern, building on PayGate's design

---

## Post-hackathon support commitments

If PayGate wins or places in BUIDL_QUESTS 2026:

- All code remains MIT licensed (no relicensing, no surprise terms)
- We commit to maintaining the contracts and SDK for at least 12 months
- We commit to a public security disclosure process (see `SECURITY.md`)
- We commit to a public roadmap (this document)
- We commit to engaging with the ERC-8004 working group on cross-references

If PayGate does NOT place:

- Same commitments. The code is useful regardless of the hackathon outcome.
