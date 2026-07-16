# OpenArena Submission Form — Pre-filled Answers

> Submit at: https://openarena.to/en/events/buidl-quests-2026
> Track: **02 — Sovereignty**
> Window closes: **Aug 12, 2026 18:00 SGT**

Copy-paste each field. Edit only where indicated in `[brackets]`.

---

## Field 1: Project Name
```
PayGate
```

## Field 2: One-line pitch (max 80 chars)
```
x402 + ERC-8004 + on-chain spending policy + kill switch for AI agents
```
(That's 68 chars. Fits.)

## Field 3: Description (max 1500 chars)

```
PayGate is a sovereign payment + identity layer for AI agents.

The x402 standard (Coinbase, May 2025) lets agents pay each other USDC over HTTP. 169+ SDKs. 13,000+ registered services. But x402 has no:
- identity (anyone can spin up a wallet)
- policy (a compromised agent can drain you)
- kill switch (no way to pause a rogue agent)
- reputation (no way to know if an agent is trustworthy)

ERC-8004 ("Trustless Agents", live on Base since Feb 2026, 17,600+ agents) provides identity + reputation. PayGate is the missing operational layer that uses them.

What PayGate adds:
- SpendingPolicy contract per agent (per-call cap, per-epoch cap, allowlist) — enforced on-chain, not in the SDK
- One-transaction kill switch via deactivate()/reactivate()
- x402 v2 payment flow with EIP-3009 USDC
- Drop-in TypeScript SDK: wrap(fn, opts) makes any async function a PayGate-protected agent in 5 lines
- Mitigates all 5 known attacks on x402 (arXiv:2605.11781): grant-before-settle, missing resource binding, fire-and-forget settlement, missing Cache-Control, replay

Live on Base Sepolia: 0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A
Open source (MIT): https://github.com/Donyemiight/paygate
```
(About 1180 chars. Fits.)

## Field 4: Track
```
02 - Sovereignty
```

## Field 5: Repository URL
```
https://github.com/Donyemiight/paygate
```

## Field 6: Live demo URL
```
https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A
```

(Use the BaseScan link to the deployed contract. The contract + live agent state is the canonical "live artifact" for BUIDL_QUESTS. You can replace this with a Render URL after deploying the demo at https://paygate-demo.onrender.com, but the BaseScan link is acceptable as-is.)

## Field 7: Demo video URL
```
[YOUTUBE_URL_OF_DEMO_VIDEO]
```

(Record per DEMO-SCRIPT.md, upload as YouTube **unlisted** (NOT private — judges need to view it without an account). Paste the link here.)

If you don't have a video yet, submit with this placeholder and update the form field after you record. OpenArena allows editing submissions up to the deadline.

> **Note on video length:** The official BUIDL_QUESTS 2026 page does NOT specify a max video length. Target **90–120 seconds** to match the `DEMO-SCRIPT.md` (2-minute version). Comparable 2026 hackathons (ETHGlobal BuildQuest 2–4 min, Polygon BUIDL IT 3–5 min, Areon < 5 min) suggest 2–4 min is the safe range. **If the actual submission form shows a max length field, respect it.**

## Field 8: Built with
```
Solidity 0.8.24, OpenZeppelin 5, Hardhat, TypeScript, viem, x402 v2, Express, Base Sepolia, ERC-8004, EIP-3009
```

## Field 9: Team size
```
1 (solo founder)
```

## Field 10: Team name
```
[YOUR_NAME] (or just "Donyemiight")
```

## Field 11: Founder name
```
[YOUR_REAL_NAME]
```

## Field 12: Founder email
```
[YOUR_EMAIL] - this is where the shortlist notification goes
```

## Field 13: Founder X / Twitter
```
[YOUR_X_HANDLE]
```

## Field 14: Country
```
[YOUR_COUNTRY]
```

## Field 15: How did you hear about BUIDL_QUESTS?
```
Direct invitation / Twitter / Amber Group announcement / [whichever]
```

## Field 16: Optional: any prior funding?
```
No (this is a fresh project, not a pivot of an existing funded company)
```

## Field 17: Optional: post-hackathon plan
```
1. Land the kill switch as a feature in at least 2 existing x402 SDKs (proposed PRs to x402-express and Rail402)
2. Apply to the amber.ac accelerator
3. Launch a PayGate Directory — a public registry of agents with live policy + reputation state
4. Ship mainnet deploy on Base once audit complete (Halborn partnership via BUIDL_QUESTS)
```

## Field 18: Anything else?
```
PayGate was built in 3 weeks specifically for BUIDL_QUESTS 2026. The full
architecture, deployment, and SDK are open source under MIT. The team has
prior shipped agent-service work: ReppS (x402 on X Layer), VibeCast
(YouTube-to-thread), LCP RiskGuard (liquidity monitoring).
```

---

# Checklist before submitting

- [ ] Demo URL is live (or BaseScan link is set as fallback)
- [ ] Demo video is uploaded to YouTube (unlisted OK)
- [ ] GitHub repo is public at https://github.com/Donyemiight/paygate
- [ ] Contact email is one you actually check
- [ ] All `[brackets]` filled in
- [ ] No placeholder text remaining
- [ ] Submission made BEFORE Aug 12, 18:00 SGT (≈ 12:00 UTC)

# After submission

You'll get a confirmation email. Top 20 announced Sep 11, Top 10 announced Sep 24. Pitch Day Singapore Oct 5.

If shortlisted, OpenArena will reach out via the email you provided. Check spam folder.
