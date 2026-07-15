# BUIDL_QUESTS 2026 — OpenArena Submission Answers

> **Project:** PayGate — Sovereign payment + identity layer for AI agents
> **Track:** 02 — Sovereignty
> **Submission window:** Jul 6 – Aug 12, 2026 (18:00 SGT)
> **Repo:** https://github.com/Donyemiight/paygate
> **Demo URL (Base Sepolia):** https://paygate-demo.onrender.com (TBD)
> **Pitch Day:** Oct 5, Singapore
> **Demo Day:** Oct 6, CHIJMES, Singapore
> **Deployed contract (Base Sepolia):** `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` ([BaseScan ↗](https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A))

---

## 1. One-line pitch

PayGate wraps any AI agent with ERC-8004 on-chain identity, an on-chain spending policy, and a human-controlled kill switch — all enforced on every x402 payment.

## 2. What is it?

An SDK + smart contract pair that bolts a **sovereignty layer** on top of the existing x402 payment standard. Three components:

1. **`PayGateRegistry`** — singleton contract on Base. Mints a PayGate `agentId`, deploys a per-agent `SpendingPolicy`, binds the agent's wallet, human owner, and (optionally) an existing ERC-8004 identity.
2. **`SpendingPolicy`** — per-agent contract enforcing per-call cap, per-epoch cap, allowlist, and a kill switch. Reverts any x402 settlement that violates policy.
3. **`@paygate/sdk`** — TypeScript SDK. `wrap(fn, opts)` makes any function an x402-gated PayGate agent in 5 lines.

## 3. Why does it matter?

The x402 ecosystem has 13,000+ registered services and 169+ SDKs, but **nobody is building the safety rails**:

- A compromised agent can drain its owner's USDC. x402 has no policy.
- A misaligned agent can keep operating against the owner's will. x402 has no kill switch.
- Two agents transacting have no way to verify each other's identity. x402 is wallet-to-wallet.
- An agent's track record is invisible. x402 has no reputation layer.

ERC-8004 (live on Base since Feb 2026, 17,600+ agents) provides identity and reputation primitives. **PayGate is the missing operational layer that uses them.**

We also explicitly mitigate the **five known attacks on x402** identified in the May 2026 arXiv paper *Five Attacks on x402 Agentic Payment Protocol* — a real, published research gap, not a marketing claim.

## 4. How is it novel?

- **First contract-enforced spending policy for x402.** MoltsPay and Azeth SDKs have policy, but it lives off-chain. A misaligned SDK can bypass it. PayGate's policy is checked in the contract itself.
- **First x402 wrapper to integrate ERC-8004 as a first-class concept.** Azeth SDK reads ERC-8004; PayGate writes to it.
- **First x402 wrapper with an on-chain kill switch.** One transaction, irreversible, no admin key.
- **First submission to BUIDL_QUESTS 2026 to ship the attack-mitigation angle as a primary feature.**

## 5. How is it built?

| Layer | Stack |
|---|---|
| Smart contracts | Solidity 0.8.24, OpenZeppelin 5, Hardhat, OpenZeppelin upgradeability (not used in v1) |
| SDK | TypeScript ESM, viem 2, x402 0.6 |
| Demo | Express 4, Node 18, single-binary deploy |
| Chain | Base Sepolia (test), Base mainnet target |
| Identity | ERC-8004 (`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`) |
| Payment | x402 v2 over EIP-3009 USDC transfers |

## 6. What's the demo?

Two agents on Base Sepolia:

- `POST /agents/sentiment` — $0.01/call
- `POST /agents/summarize` — $0.02/call

Plus a `/` dashboard with the kill switch and live policy state. Call the agent without payment → 402 with payment requirements. Call with PayGate SDK → 200 + settlement tx on BaseScan.

The video (3 min, screen recording + voiceover) shows: register → set policy → call agent → call exceeds cap and gets blocked → owner pauses → owner resumes.

## 7. Team

Solo founder. O.A Dolapo. AI agent builder with prior shipped work:
- **ReppS** (https://repps.xyz) — adversarial pre-flight layer for AI agents, OKX AI Genesis Hackathon submission
- **VibeCast** (https://vibecast-ptrq.onrender.com) — YouTube-to-thread generator, x402 v2 service
- **LCP RiskGuard** (https://networkbike.github.io/lcp-riskguard-agent/) — agent service for liquidity stress monitoring

GitHub: @ademidun69

## 8. Post-hackathon plan

- Land the kill switch as a feature in at least 2 existing x402 SDKs (proposed PRs to `x402-express` and `Rail402`).
- Apply to the **amber.ac accelerator** (the explicit post-hackathon path BUIDL_QUESTS offers).
- Launch a **PayGate Directory** — a public registry of agents with live policy + reputation state, browsable by humans and callable by other agents.
- Open-source everything under MIT.

## 9. Asks

- Top-20 selection would unlock: travel support to Singapore, mentorship, AWS credits.
- Top-10 selection would unlock: closed-door pitch to investors at Amber Group's network.
- Any placement: cash + credits, exposure to 250K+ developer community on OpenArena + DoraHacks.

---

**Track this submission on OpenArena:** https://openarena.to/en/events/buidl-quests-2026
**Watch the build on GitHub:** https://github.com/ademidun69/paygate
