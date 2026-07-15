# PayGate Demo Video — 90s Script for BUIDL_QUESTS 2026

> Record on your phone, vertical (9:16) or 16:9. Use Termux screenrecord or just point the phone at the screen. Same format as your OKX/Pharos recordings.

**Targets:** ≤ 90 seconds, single take is fine, no edits required. Judges watch the first 30 seconds and decide.

---

## 0:00–0:08 — Hook (8 sec)

> **[Camera on the demo URL in a browser. Type the URL: `paygate-demo.onrender.com`]**

**Voiceover:**

> "AI agents can pay each other with x402 now — but nobody can stop them. PayGate fixes that."

**[Cut to: terminal showing the contract on BaseScan]**

> "Live on Base Sepolia. One contract. Two minutes to integrate."

---

## 0:08–0:25 — Problem (17 sec)

**[Screen: paste the May 2026 arXiv paper headline into a browser tab, or have a slide ready]**

> "Last month, researchers published 'Five Attacks on x402'. Grant-before-settle. Replay. No kill switch. Every agent built today is vulnerable."

**[Screen: switch to a plain x402 endpoint demo, no PayGate]**

> "A compromised agent can drain your wallet. There's no policy. There's no way to pause it. There's no identity — anyone can spin up a wallet."

---

## 0:25–0:50 — Solution (25 sec)

**[Screen: split — left: code of `wrap()`, right: the contract on BaseScan]**

> "PayGate is an x402 wrapper with three primitives: identity, policy, kill switch."

**[Highlight each as you say it:]**

> "ERC-8004 identity on Base — your agent gets a portable on-chain handle, 17,000 agents already use it."

> "A per-agent SpendingPolicy contract — per-call cap, per-epoch cap, allowlist. Enforced on-chain, not in the SDK."

> "And a kill switch — one transaction, irreversible, no admin key."

---

## 0:50–1:15 — Live Demo (25 sec)

**[Screen: open the demo dashboard. Paste text into the orchestrator input. Click Run.]**

> "Let me show you. Two agents, both protected by PayGate. I'll pay Sentiment $0.01 and Summarizer $0.02 — both on Base Sepolia, real USDC."

**[Wait for the modal to show the results + the settlement tx hashes]**

> "Both payments settled. Settlement tx is right here on BaseScan."

**[Switch to the kill switch UI. Click "Pause Agent". Try to call again.]**

> "Now I hit kill switch. One tx. The next call fails — policy says no."

**[Click Resume]**

> "One more tx. We're back. Same agent, fresh policy."

---

## 1:15–1:30 — Pitch (15 sec)

**[Camera on you, or back to the code]**

> "PayGate is the missing operational layer for the 17,000 agents already on Base. x402 + ERC-8004 + an on-chain policy. MIT licensed. Built in 3 weeks."

> "Track 02 — Sovereignty. Let's talk."

---

# Recording Checklist

- [ ] Demo URL live (Render deploy) — paste the URL into your browser first
- [ ] Have 3 browser tabs ready: demo / BaseScan / GitHub
- [ ] Have a small amount of Base Sepolia USDC in your wallet for the demo payment (use Circle faucet)
- [ ] Terminal showing `git log --oneline | head -3` ready
- [ ] Voiceover: short sentences, no ums, no long pauses
- [ ] Length: 85–95 seconds. Cut at 90s even if mid-sentence
- [ ] Upload to YouTube (unlisted) AND add to OpenArena submission form
- [ ] Mirror to X with #BUIDL_QUESTS #Sovereignty #Base #AIagents #x402

# B-roll Shots to Capture (for any edits later)

- BaseScan page for the deployed PayGateRegistry contract
- The 5 known attacks from arXiv:2605.11781 (one slide, 5 bullets)
- The OpenZeppelin 5.x Ownable constructor — show that the registry owns the policy
- Your `wrap()` function in the editor (3 lines, with arrows pointing at it)
- The 7 smoke test checks all passing

# Notes for Yourself

- **Don't explain the architecture in the video.** Judges skim. The README is the deep dive.
- **Show the kill switch live.** It's the single most novel thing about PayGate. If you can show "agent was working, paused, won't respond" in 5 seconds, you win.
- **Skip the "what is x402" intro.** Every BUIDL_QUESTS judge already knows. Spend the time on the kill switch.
- **If the demo URL is down** (Render free tier sleeps), use the BaseScan link to the deployed contract as the main visual, and have the GitHub repo tab ready. Don't let a 30s Render wake-up eat the recording.
