# Changelog

All notable changes to PayGate.

## [0.1.0] — 2026-07-15

Initial submission for BUIDL_QUESTS 2026 (Sovereignty track).

### Added

- `PayGateRegistry` contract — singleton on Base Sepolia at `0x09A4b760Ea42325508fC6b9b6777CAb667071595`
- `SpendingPolicy` contract — per-agent, enforces caps + allowlist + kill switch
- `@paygate/sdk` — TypeScript SDK with `wrap()`, `call()`, `register()`, plus ERC-8004 helpers
- `paygate` CLI — terminal-native tool for `register`, `status`, `pause`, `resume`, `call`, `whoami`
- 3-agent demo server: Sentiment (free), Summarizer ($0.02), Translate ($0.03, LLM-backed with mock fallback)
- PayGate Directory — on-chain agent browser at `/directory`
- "5 attacks on x402" explainer page at `/attacks.html`
- Landing page at `public/index.html`
- Full docs: README, DEPLOY, ARCHITECTURE, SECURITY, DEMO-SCRIPT, OPENARENA-FORM, X-POSTS
- 13/13 Hardhat tests pass
- End-to-end smoke test on Base Sepolia: 7/7 checks pass

### Security

- Mitigates all 5 known x402 attacks (arXiv:2605.11781): grant-before-settle, missing resource binding, fire-and-forget settlement, missing Cache-Control, replay
- SpendingPolicy is contract-enforced, not SDK-enforced (compromised agent cannot bypass)
- Registry owns policies, not the human (clean privilege separation)

### Known limitations

- v1 has no two-step `rotateWallet` handover (front-running possible)
- Allowlist is implemented with a single `mapping` + a strict-mode boolean (not enumerable)
- No on-chain batched-settlement for multiple spend events in one tx
- No formal verification yet
- Not professionally audited (Halborn audit targeted for post-hackathon)
- Deployed registry on Base Sepolia uses the older allowlist-strict logic; a v2 deployment will use the new logic (currently only in the test suite)

See `docs/SECURITY.md` for the full threat model and pre-mainnet recommendations.

### Track target

BUIDL_QUESTS 2026, Sovereignty (track 02).
Submission deadline: Aug 12, 2026, 18:00 SGT.
