# PayGate — Press Kit

> For journalists, judges, and content creators writing about PayGate.
> Last updated: 2026-07-15.

## One-line summary (60 chars)

> PayGate is the sovereignty layer for AI agents on Base.

## Two-line summary (160 chars)

> PayGate wraps any x402 agent with on-chain identity (ERC-8004), on-chain spending policy, and a one-tx kill switch. Live on Base Sepolia. MIT.

## One-paragraph summary (use in articles)

PayGate is an open-source project that adds three missing primitives to the x402 agent-payment standard: on-chain identity (via ERC-8004), on-chain spending policy (per-call cap, per-epoch cap, allowlist), and a one-transaction kill switch. The policy is enforced by a smart contract, not the SDK — meaning a compromised agent cannot bypass it. The project was submitted to BUIDL_QUESTS 2026 (Sovereignty track) and is live on Base Sepolia. It mitigates all 5 known attacks on x402 published in arXiv:2605.11781 (May 2026).

## Key facts (cite these)

| Fact | Detail |
|---|---|
| **Project name** | PayGate |
| **Live contract** | `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` on Base Sepolia |
| **BaseScan** | https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A |
| **GitHub** | https://github.com/Donyemiight/paygate |
| **License** | MIT |
| **Built in** | 3 weeks (June 23 – July 15, 2026) |
| **Lines of Solidity** | ~500 (excluding tests) |
| **Test coverage** | 13 Hardhat tests + 13 Foundry tests + 13 integration tests on testnet |
| **Total testnet txs** | ~30 (register, recordSpend, deactivate, reactivate, setAllowlist, etc.) |
| **Stack** | Solidity 0.8.24, OpenZeppelin 5.x, Hardhat, TypeScript, viem, x402 v2, Express, Base Sepolia |
| **Standards used** | ERC-8004 (identity + reputation), EIP-3009 (transferWithAuthorization), x402 v2 |
| **Mitigates** | 5 known x402 attacks (arXiv:2605.11781) |
| **Sponsor** | BUIDL_QUESTS 2026 (Amber Group + Halborn Security) |

## Quotes (attributable)

### On the problem

> "x402 lets agents pay each other, but it has no concept of who is paying, how much they're allowed to spend, or how to stop them. A compromised agent can drain its owner's wallet."
> — O.A Dolapo, project lead

> "Last month, researchers identified 5 concrete attacks on x402. Every agent built today is vulnerable to at least one of them."
> — citing arXiv:2605.11781

### On the solution

> "PayGate is the only x402 wrapper where the spending policy is enforced by the contract, not the SDK. A compromised agent cannot bypass it."
> — O.A Dolapo

> "We compose with ERC-8004 instead of competing with it. The 17,600+ agents already on Base can adopt PayGate without re-registering."
> — O.A Dolapo

### On the kill switch

> "The kill switch is one transaction, irreversible, and has no admin key. The owner always wins. That's the only way the agent economy can work at scale."
> — O.A Dolapo

## Visuals to use in articles

| File | Size | When to use |
|---|---|---|
| `public/og.png` | 56KB | Social sharing (1200×630) |
| `public/index.html` | 8KB | Landing page (host on GitHub Pages) |
| `public/attacks.html` | 9KB | The 5 attacks + PayGate's fixes |
| `public/why.html` | 7KB | 4-scenario decision guide |
| `docs/SECURITY-ONE-PAGE.pdf` | 5.7KB | 1-page security summary |
| `docs/PITCH-DECK.pdf` | 7.2KB | 4-page pitch deck |

## Boilerplate (50 words)

> PayGate is an open-source (MIT) smart-contract system that adds on-chain identity, on-chain spending policy, and a kill switch to the x402 agent-payment standard. Built for BUIDL_QUESTS 2026 (Sovereignty track), live on Base Sepolia, mitigates all 5 known x402 attacks as documented in arXiv:2605.11781.

## Boilerplate (100 words)

> PayGate is an open-source (MIT) smart-contract system built for BUIDL_QUESTS 2026 (Sovereignty track). It adds three missing primitives to the x402 agent-payment standard: on-chain identity (via ERC-8004), on-chain spending policy (per-call cap, per-epoch cap, allowlist, enforced by the contract), and a one-transaction kill switch. The project mitigates all 5 known x402 attacks published in arXiv:2605.11781 (May 2026). PayGate is live on Base Sepolia at 0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A, with 13/13 Hardhat tests, 13 Foundry tests, and 13/13 integration tests passing on testnet.

## How to embed in articles

```html
<!-- Demo video (replace YOUTUBE_ID with your actual YouTube video ID) -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/YOUTUBE_ID" 
  title="PayGate demo" frameborder="0" allowfullscreen></iframe>
```

```markdown
[PayGate](https://github.com/Donyemiight/paygate) is a sovereign payment + identity layer for AI agents on Base. [Live demo](https://paygate-demo.onrender.com) · [Source](https://github.com/Donyemiight/paygate) · [1-page security PDF](https://raw.githubusercontent.com/Donyemiight/paygate/main/docs/SECURITY-ONE-PAGE.pdf)
```

## Press contact

- **Email:** press@paygate.dev (placeholder — replace with your real email)
- **GitHub issues:** https://github.com/Donyemiight/paygate/issues (tag: `press`)
- **Telegram / X:** [YOUR_HANDLE_HERE]

## Response time

Press inquiries get a response within 24 hours. Bug disclosures are NOT press — see `SECURITY.md`.

## Embargo

There is no embargo. PayGate is fully open source. You may write about it, deploy it, fork it, or extend it without prior notice.

## Brand assets

- Logo: text-based (no SVG yet — pull from `public/og.png` for now)
- Color: #7c5cff (primary), #22c55e (success), #f59e0b (warning), #ef4444 (error)
- Typography: sans-serif (Inter or system-ui preferred)
