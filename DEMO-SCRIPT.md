# PayGate Demo Video — 2-Minute Script for BUIDL_QUESTS 2026

> Record on your phone, vertical (9:16) or 16:9. Use Termux screenrecord or just point the phone at the screen. Same format as your OKX/Pharos recordings.

**Target:** 90–120 seconds, single take is fine, no edits required. **The official BUIDL_QUESTS 2026 page does NOT publish a video length limit**, but comparable 2026 hackathons on this platform (ETHGlobal BuildQuest, Polygon BUIDL IT, Areon) all sit in the 2–4 minute range. We're going with **2 minutes** to be safe and give judges enough context.

**Belt and suspenders:** If you'd rather record a tighter 90-second version, the previous 90s script (in `git log` of this file) is still valid — most judges watch the first 30 seconds anyway.

---

## 0:00–0:10 — Hook (10 sec)

> **[Camera on the demo URL in a browser. Type the URL: `paygate-demo.onrender.com`]**

**Voiceover:**

> "AI agents can pay each other with x402 now — but nobody can stop them. PayGate fixes that."

**[Cut to: terminal showing the contract on BaseScan]**

> "Live on Base Sepolia. One contract. Two minutes to integrate."

---

## 0:10–0:30 — Problem (20 sec)

**[Screen: have the May 2026 arXiv paper headline ready in a tab, or a single slide]**

> "Last month, researchers published 'Five Attacks on x402'. Grant-before-settle. Replay. No kill switch. Every agent built today is vulnerable."

**[Screen: switch to a plain x402 endpoint demo, no PayGate]**

> "A compromised agent can drain your wallet. There's no policy. There's no way to pause it. There's no identity — anyone can spin up a wallet."

---

## 0:30–1:00 — Solution (30 sec)

**[Screen: split — left: code of `wrap()`, right: the contract on BaseScan]**

> "PayGate is an x402 wrapper with four primitives: identity, policy, kill switch, reputation."

**[Highlight each as you say it:]**

> "ERC-8004 identity on Base — your agent gets a portable on-chain handle. 17,600 agents already use it."

> "A per-agent SpendingPolicy contract — per-call cap, per-epoch cap, allowlist. Enforced on-chain, not in the SDK."

> "A kill switch — one transaction, irreversible, no admin key."

> "And ERC-8004 reputation — every call writes a feedback event. Other agents see it before they pay."

---

## 1:00–1:40 — Live Demo (40 sec) — **the money shot**

**[Screen: open the demo dashboard. Paste text into the orchestrator input. Click Run.]**

> "Let me show you. Three agents: Sentiment free, Summarizer $0.02, Translate $0.03. All on Base Sepolia, all x402-gated, all behind PayGate."

**[Wait for the modal to show the results + the 402 responses with paygate status]**

> "Free agent returns 200. Paid agents return 402 with payment requirements AND the live PayGate state — see this `killSwitch: ACTIVE` field? That's the contract speaking, not the SDK."

**[Switch to the kill switch UI. Click "Pause Agent". Wait 3s. Try to call again.]**

> "Now I hit kill switch. One tx. The next call returns 402 with `killSwitch: AGENT_PAUSED` — policy says no, settlement would revert."

**[Click Resume. Wait 3s.]**

> "One more tx. We're back. Same agent, fresh policy. The whole flow ran in real Base Sepolia time, no mocks."

---

## 1:40–2:00 — Pitch (20 sec)

**[Camera on you, or back to the code]**

> "PayGate is the missing operational layer for the 17,600 agents already on Base. x402 + ERC-8004 + on-chain policy. MIT licensed. Built in 3 weeks. 13 Hardhat tests, 13 Foundry tests, 7 smoke tests, 13 integration tests, all passing on live testnet."

> "Track 02 — Sovereignty. Let's talk."

---

# Recording Checklist

- [ ] Demo URL live (Render deploy) — open it in a tab first to warm it up (free tier sleeps after 15 min)
- [ ] Have 3 browser tabs ready: `paygate-demo.onrender.com` / BaseScan / GitHub
- [ ] (Optional) Have a small amount of Base Sepolia USDC in your wallet for a real settlement demo (use Circle faucet)
- [ ] Terminal showing `git log --oneline | head -3` ready
- [ ] Voiceover: short sentences, no ums, no long pauses
- [ ] Length: 90–120 seconds. Hard cut at 2:00 even if mid-sentence
- [ ] **Confirm with the actual form** when it loads: if there's a max length field, respect it
- [ ] Upload to YouTube (**unlisted** — NOT private, judges need to view it without an account)
- [ ] Add the YouTube link to the OpenArena submission form
- [ ] (Bonus) Mirror to X with #BUIDL_QUESTS #Sovereignty #Base #AIagents #x402

# B-roll Shots to Capture (for any edits later)

- BaseScan page for the deployed PayGateRegistry contract
- The 5 known attacks from arXiv:2605.11781 (one slide, 5 bullets)
- The OpenZeppelin 5.x Ownable constructor — show that the registry owns the policy
- Your `wrap()` function in the editor (3 lines, with arrows pointing at it)
- The 7 smoke test checks all passing
- The `/api/agents` JSON output showing the on-chain agent

# Notes for Yourself

- **Don't explain the architecture in the video.** Judges skim. The README is the deep dive.
- **Show the kill switch live.** It's the single most novel thing about PayGate. If you can show "agent was working, paused, won't respond" in 5 seconds, you win.
- **Skip the "what is x402" intro.** Every BUIDL_QUESTS judge already knows. Spend the time on the kill switch.
- **If the demo URL is down** (Render free tier sleeps), use the BaseScan link to the deployed contract as the main visual, and have the GitHub repo tab ready. Don't let a 30s Render wake-up eat the recording.
- **The paygate field in the 402 response is your secret weapon.** When judges see the kill switch state echoed in the 402 JSON, they immediately understand the contract is the source of truth, not the SDK. Highlight that in the demo.
