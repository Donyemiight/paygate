# OpenArena Submission Form — Pre-filled Answers

> **Submit at:** https://openarena.to/en/submit?event=buidl-quests-2026
> **Track:** 02 — Sovereignty
> **Deadline:** Aug 12, 2026 18:00 SGT (15 days from now)
> **Video max length:** 3 minutes (your video is 2:03 — fits ✅)
> **GitHub repo REQUIRED** (the form warns: "GITHUB REPO MUST BE PROVIDED TO PARTICIPATE")

The form is client-side React. Fields below are extracted from the embedded `translations` JSON.

---

## Field 1: Project Name
```
PayGate
```

## Field 2: One-line pitch / Tagline
```
x402 + ERC-8004 + on-chain spending policy + kill switch for AI agents
```

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

## Field 4: Track
```
02 - Sovereignty
```

## Field 5: GitHub Repository URL (REQUIRED)
```
https://github.com/Donyemiight/paygate
```

## Field 6: Live demo URL
```
https://paygate-demo.onrender.com
```

## Field 7: Demo Video URL (max 3 minutes)
```
https://youtu.be/kKA8nKGobbo?si=LGbOqBxVBoSqFih-
```

## Field 8: Submitter Email
```
[YOUR_EMAIL]  ← you must fill this in
```

## Field 9: Payout Address (where prize will be sent)
```
0xb859C2038e8b1A3AE678DEEB6D1424FaF439c7EF
```

## Field 10: How did you hear about us
```
Amber Group / Twitter / OpenArena
```

## Field 11: X (Twitter) Post URL (optional — can update after posting)
```
[URL_OF_X_THREAD_ONCE_POSTED]
```

## Field 12: Funding status (optional)
```
not raised yet
```

## Field 13: Pain Point Solved (optional, multi-line text)
```
x402 has 5 known attacks (grant-before-settle, replay, missing kill switch,
no identity, no policy). PayGate is the missing operational layer — a
per-agent SpendingPolicy contract that enforces caps on-chain, plus a
one-transaction kill switch, plus ERC-8004 identity + reputation integration.
```

## Field 14: Expectations (multi-select — pick all that apply)
```
[Select: "Funding" / "Mentorship" / "Connections" / "Acceleration" / "Demo Day"
whichever feels right]
```

---

# Pre-submit checklist

- [ ] GitHub repo is public at https://github.com/Donyemiight/paygate ✅
- [ ] Demo URL is live (https://paygate-demo.onrender.com) ✅
- [ ] Demo video is uploaded to YouTube as **Unlisted** (NOT Private) ✅
- [ ] Video length is 2:03, well under the 3-min limit ✅
- [ ] Contact email is one you actually check
- [ ] Submit BEFORE Aug 12, 18:00 SGT (15 days from now)

# After submission

You'll get a confirmation email. Top 20 announced Sep 11, Top 10 announced Sep 24. Pitch Day Singapore Oct 5.

If shortlisted, OpenArena will reach out via the email you provided. **Check spam folder.**

---

# What I had WRONG in the previous version of this file

The form does NOT have:
- ❌ "Built with" (used to be Field 8)
- ❌ "Team size" (used to be Field 9)
- ❌ "Team name" (used to be Field 10)
- ❌ "Founder name" (used to be Field 11)
- ❌ "Founder X / Twitter" (used to be Field 13)
- ❌ "Country" (used to be Field 14)

It DOES have:
- ✅ Project Name
- ✅ Tagline
- ✅ Description
- ✅ Track
- ✅ GitHub URL (REQUIRED)
- ✅ Live demo URL
- ✅ Video Link (max 3 min)
- ✅ Submitter Email
- ✅ Payout Address
- ✅ How did you hear about us
- ✅ X Post URL (optional)
- ✅ Funding status (optional)
- ✅ Pain Point Solved (optional)
- ✅ Expectations (multi-select)
