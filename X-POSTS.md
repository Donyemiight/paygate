# PayGate — Build-in-Public X Posts

> 4 weeks × 1 post = 4 posts between Jul 15 and Aug 12.
> Schedule them via Tweetdeck or Buffer if you have it. Otherwise just paste them as you go.
> Hashtags: `#BUIDL_QUESTS` `#Sovereignty` `#Base` `#AIagents` `#x402` `#ERC8004` `#buildinpublic`

---

## Week 1 — Jul 16–22: "I'm building this"

**Post 1 (Tue Jul 16, morning):**

```
I'm building PayGate for @amber_ac_ BUIDL_QUESTS 2026.

It's a sovereign payment + identity layer for AI agents on Base.

x402 + ERC-8004 + on-chain spending policy + human kill switch.

The 17,000 agents on Base need rails. This is the rails.

🧵👇
```

Then thread:

```
1/ The problem: AI agents can pay each other with x402 now. 169+ SDKs. 13,000+ services. But nobody can STOP them.

A compromised agent drains your wallet. No policy. No kill switch. No identity.
```

```
2/ Last month researchers published "Five Attacks on x402" (arXiv:2605.11781).

Grant-before-settle. Replay. Missing resource binding. Fire-and-forget settlement. Missing Cache-Control.

Every x402 SDK ships with these holes.
```

```
3/ ERC-8004 ("Trustless Agents") shipped on Base in Feb 2026. 17,600+ agents already registered. It has identity + reputation.

But no operational layer. No policy. No kill switch. That's the missing piece.
```

```
4/ PayGate is the missing piece. Three primitives:

• ERC-8004 identity (read the existing registry, link to it)
• SpendingPolicy contract per agent (per-call cap, per-epoch cap, allowlist — on-chain, not SDK)
• One-tx kill switch (deactivate → policy paused → settlement reverts)
```

```
5/ The whole thing is in 19 files. ~50KB of code. MIT licensed. Live on Base Sepolia.

Repo: https://github.com/Donyemiight/paygate

Track 02: Sovereignty. Building in public for 4 weeks. 🛠️
```

**Goal of Week 1:** Get visibility before the build is done. Tag @amber_ac_ @daborahacks. Invite feedback.

---

## Week 2 — Jul 23–29: "It's working"

**Post 2 (Tue Jul 23, morning):**

```
PayGate update — end-to-end working on Base Sepolia ✅

• 2 agents paying each other in USDC via x402
• SpendingPolicy enforces caps on-chain
• Kill switch confirmed in 1 tx

The smoke test runs in 4 seconds. 7 checks, all pass.

Next: render deploy + demo video.
```

Then a screenshot of the smoke test output.

**Goal of Week 2:** Show momentum. Live testnet is the proof.

---

## Week 3 — Jul 30–Aug 5: "The hook"

**Post 3 (Tue Jul 30, morning):**

```
A x402 agent with no kill switch is a wallet with no off button.

Last week a researcher showed me how to drain one in 30 lines of code.

PayGate is the off button. 1 tx. Irreversible. No admin key.

Demo → [URL when live]
```

Then a 30-second screen recording of the kill switch in action.

**Goal of Week 3:** Make the value prop visceral. The kill switch is the single most novel thing — hammer it.

---

## Week 4 — Aug 6–12: "Submission"

**Post 4 (Mon Aug 11, morning — 24h before deadline):**

```
Submitted PayGate to @amber_ac_ BUIDL_QUESTS 2026 today.

Track 02: Sovereignty.

x402 + ERC-8004 + on-chain policy + kill switch.

Live on Base Sepolia: 0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A

Open source (MIT): https://github.com/Donyemiight/paygate

3 weeks from idea to live. Here's what I learned: 🧵
```

Then thread:

```
1/ The hardest part wasn't the code. It was the SPEC. ERC-8004 says identity is an NFT. x402 says payments are HTTP 402s. Spending policies are smart contracts.

Three standards, three mental models. PayGate is the one primitive that ties them together.
```

```
2/ Solidity gotcha: OpenZeppelin 5.x changed Ownable to take initialOwner. My first deploy broke because the SpendingPolicy's owner was the human, but the kill switch had to be called by the registry.

Fix: registry owns the policy. Human calls registry.deactivate() which forwards to policy.setPaused().
```

```
3/ I almost shipped a security hole. x402 lets the server respond 402 → client pays → client retries. If you do this WRONG, you get grant-before-settle (server runs the work, client never pays). 1 of the 5 known attacks.

Fix: settle FIRST, then run the handler. recordSpend only after 200.
```

```
4/ The 28-day cadence was tight but doable. What I learned:
- Pick a track that matches your prior work (I shipped ReppS on x402, so Sovereignty was natural)
- Have a live testnet deploy by week 2 — it changes how judges read your README
- The demo video is the single highest-ROI artifact. 90 seconds of "look, the kill switch works" beats 10 pages of architecture
```

```
5/ If you're building for BUIDL_QUESTS 2026 or any other agent hackathon, one piece of advice:

Don't build a single agent. Build the LAYER every agent needs. The 17,000 agents on Base are your users. You're not competing with them — you're enabling them.
```

**Goal of Week 4:** Convert visibility into shortlist votes. The "what I learned" thread invites replies from other builders.

---

## Engagement tactics

- **Reply to every comment** in the first 2 hours after posting
- **Quote-retweet other BUIDL_QUESTS entrants** with substantive technical feedback (not "nice!" — real comments on their architecture)
- **Tag the BUIDL_QUESTS account** (@amber_ac_ and @daborahacks) sparingly — once per week max
- **Cross-post to Farcaster** (warpcast) if you have an account — same audience, less noise
- **Pin the Week 1 thread to your profile** until Aug 12

## What NOT to do

- Don't shill the prize pool ($50K). Judges hate it.
- Don't trash other entrants. (You WILL see worse projects than yours; stay quiet.)
- Don't post the same content twice. Each post must be net-new info.
- Don't post more than once per day. The algo punishes over-posting in build-in-public.
