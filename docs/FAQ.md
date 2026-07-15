# PayGate — Frequently Asked Questions

> For BUIDL_QUESTS 2026 judges, curious builders, and security reviewers.
> Last updated: 2026-07-15.

## General

### What is PayGate?
A drop-in wrapper for the x402 agent-payment standard that adds three things x402 doesn't have: **on-chain identity** (ERC-8004), **on-chain spending policy** (per-call cap, per-epoch cap, allowlist), and a **one-transaction kill switch** (pause the agent, no admin key required).

### Why does this matter?
x402 (Coinbase, May 2025) lets AI agents pay each other. It's now the de facto payment rail with 169+ SDKs and 13,000+ services. But a compromised or misaligned agent can drain its owner's wallet — and the owner has no way to stop it. A May 2026 arXiv paper (arXiv:2605.11781) identified 5 concrete attacks on x402. PayGate mitigates all 5.

### Is this a new payment protocol?
No. PayGate is a **layer on top of x402**. Existing x402 services can adopt PayGate by changing 3 lines of code. We don't replace the x402 spec, we add missing safety primitives.

### Is PayGate competing with ERC-8004?
No. PayGate is a **consumer** of ERC-8004, not a competitor. We read the existing Base Identity Registry (`0x8004A169...432`) and Reputation Registry (`0x8004BAa1...b63`) and write reputation feedback to them. The 17,600+ existing agents can adopt PayGate without re-registering.

## Technical

### What's the contract size?
- `PayGateRegistry`: ~7 KB deployed (one singleton, no per-agent cost)
- `SpendingPolicy`: ~5 KB deployed per agent (so the cost scales with # of agents, not with # of payments)
- Both well under the 24KB EIP-170 contract size limit.

### What's the gas cost per payment?
On Base Sepolia (which mirrors Base mainnet pricing): ~85,000 gas for `recordSpend()` on a per-call cap hit. At 0.001 gwei (Base Sepolia), that's ~0.0000001 ETH. At 0.01 gwei (Base mainnet realistic), it's ~0.000001 ETH = $0.000004. Effectively free.

### Does PayGate support ERC-20 tokens other than USDC?
v1 is USDC-only on Base. The contract uses `transferWithAuthorization` from the USDC contract (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on mainnet, `0x036CbD53842c5426634e7929541eC2318f3dCF7e` on Sepolia). Adding EURC, USDT, or cbBTC is a 10-line change in the SDK. The contract itself is asset-agnostic — it just records a uint128 of base-units.

### Can the agent's owner rotate the agent's wallet?
Yes. `registry.rotateWallet(agentId, newWallet)` — only the human owner can call this. v1 has no two-step handover (front-running possible); v0.2 will add `proposeWallet()` / `acceptWallet()`.

### What happens if the human owner's key is lost?
The agent's wallet can be rotated by anyone who controls the human owner's address. There's no social recovery in v1. **Always back up the human owner key.** Cold storage recommended for non-trivial amounts.

### What happens if the agent's wallet is compromised?
The agent wallet can only spend up to the policy caps. A compromised agent can drain the wallet up to `$perEpochLimit` per day. The human can call `registry.deactivate(agentId)` to pause the agent (one tx, ~50,000 gas). The remaining balance is preserved.

### Is the policy enforced by the SDK or the contract?
**The contract.** The SDK calls `recordSpend()` on `SpendingPolicy`, which reverts on cap violation. A compromised SDK cannot bypass — the contract is the only path to the x402 settlement.

### Can the agent see its own policy?
Yes. The SpendingPolicy is a deployed contract; anyone can call `getPolicy()` (view function, free). This is intentional — the agent needs to know its own caps to behave well, but cannot mutate them.

### Can the policy be upgraded?
No. v1 has no upgrade path. Any change requires a new contract deployment and manual migration of the binding. This is a feature, not a bug — silent upgrades of a security-critical contract are a known foot-gun.

## Security

### Have the contracts been audited?
**No.** v0.1.0 was built in 3 weeks for BUIDL_QUESTS 2026. The full threat model + pre-mainnet audit recommendations are in `docs/SECURITY.md` and the 1-page PDF at `docs/SECURITY-ONE-PAGE.pdf`. Halborn (the BUIDL_QUESTS co-sponsor) is the planned audit partner post-hackathon.

### What's the worst-case bug?
The `setAllowlist` function had a v1 bug where the "strict" mode was never enabled. This was fixed in v2 (the deployed contract at `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` has the fix). No funds are at risk from this — the bug only affected enforcement, not the kill switch or per-call cap.

### How does PayGate handle a malicious x402 facilitator?
`wrap()` awaits a confirmed on-chain receipt from the facilitator. If the facilitator lies about settlement, the on-chain `recordSpend()` call will fail (state mismatch), and the agent is notified via the `SpendRecorded` event not being emitted. The handler is NOT run until the receipt is confirmed.

### Can a malicious agent drain another agent's USDC?
No. Each agent has its own SpendingPolicy. The human owner of agent A cannot call `setLimits()` on agent B's policy — the policy is owned by the registry, and the registry's `setLimits()` is `onlyAgentOwner`-gated.

## Adoption

### How do I add PayGate to my existing x402 service?
```typescript
// before
app.post("/api", async (req, res) => {
  const result = await myAgent(req.body);
  res.json(result);
});

// after
import { wrap } from "@paygate/sdk";
app.post("/api", wrap(cfg, async (req, res) => {
  const result = await myAgent(req.body);
  res.json(result);
}, { priceUSDC: 10000n }));
```

That's it. Your endpoint now returns 402 with payment requirements, accepts x402 payments, records on-chain spend, and respects the human's kill switch.

### How do I migrate an existing ERC-8004 agent to PayGate?
1. Call `register()` on the registry with the existing `erc8004AgentId` as the 5th arg.
2. The PayGate binding is created with `erc8004AgentId` set, but the humanOwner / agentWallet / policy are PayGate-specific.
3. Other agents that query ERC-8004 by ID will still see the original identity; they can additionally query PayGateRegistry to see the policy.

### What chains are supported?
v1 is Base + Base Sepolia. The contract is chain-agnostic — it doesn't import anything chain-specific. The SDK's default `usdcAddress` and `chainId` are hardcoded for Base, but can be overridden in the config.

### How does this compare to MoltsPay, Azeth SDK, Agent Wallet SDK?
See the README comparison table. The short version: PayGate is the only one with **on-chain** (not SDK-level) policy enforcement, the only one with a **kill switch**, and the only one that **mitigates all 5 known x402 attacks** as a primary design goal.

## Hackathon

### When is the submission deadline?
Aug 12, 2026, 18:00 SGT. (~28 days from now.)

### What's the prize structure?
$50K+ cash, $350K+ partner credits, Top 10 finalists fly to Singapore for Pitch Day (Oct 5) and Demo Day (Oct 6).

### What tracks are you targeting?
Track 02 — Sovereignty. This is the track for "agent identity, reputation, DID, wallets, payments, data ownership, privacy, ZKP, TEE, governance protocols." PayGate fits the payments + identity + governance slice.

### How will judges evaluate PayGate?
Per BUIDL_QUESTS 2026 docs: "OKX AI Internal Review" — product quality, use case strength, marketplace fit, innovation, reliability, long-term potential, social traction. PayGate scores on: (1) **innovation** (first on-chain policy + kill switch for x402), (2) **use case strength** (every x402 service is a potential user), (3) **reliability** (13/13 tests, 7/7 smoke tests, live on testnet), (4) **long-term potential** (a sovereign Layer for the entire 17,600+ agent ecosystem on Base).

## Contact

- **Repo:** https://github.com/Donyemiight/paygate
- **Contract on Base Sepolia:** [`0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A`](https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A)
- **BUIDL_QUESTS 2026 page:** https://openarena.to/en/events/buidl-quests-2026
- **Open issues for security:** https://github.com/Donyemiight/paygate/issues
- **Author:** Donyemiight

## Supporting documents

- `README.md` — main pitch
- `docs/SECURITY-ONE-PAGE.pdf` — 1-page security summary (Halborn-style)
- `docs/PITCH-DECK.pdf` — 4-page pitch deck for the Top 20 interview
- `docs/ARCHITECTURE.md` — design deep-dive
- `docs/SECURITY.md` — full threat model + audit recommendations
- `docs/DEPLOY.md` — re-deploy from scratch
- `docs/CHANGELOG.md` — version history
- `docs/FAQ.md` — this file
