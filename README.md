# PayGate

> **A sovereign payment + identity layer for AI agents.**
> x402 payments on Base · ERC-8004 identity · on-chain spending policy · human-controlled kill switch.

[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![BUIDL_QUESTS 2026](https://img.shields.io/badge/BUIDL_QUESTS-2026-7c5cff)]()
[![Sovereignty Track](https://img.shields.io/badge/track-Sovereignty-22c55e)]()
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052ff)]()
[![ERC-8004](https://img.shields.io/badge/ERC--8004-identity-22c55e)]()

## 🟢 Live on Base Sepolia

**Registry:** [`0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A`](https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A)

Run `npm run dev:demo` with `REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` to interact with the deployed contract.

**Built for [BUIDL_QUESTS 2026](https://openarena.to/en/events/buidl-quests-2026) · Sovereignty track (02).**

---

## The problem

In May 2025 Coinbase shipped **x402**: an HTTP status code (`402 Payment Required`) for agent-to-agent micropayments. It is now the de facto payment rail for AI agents, with 169+ open-source SDKs and 13,000+ registered services.

But x402 has no concept of:

1. **Who is paying.** Every x402 endpoint receives USDC from a wallet, but anyone can spin up a wallet. There is no "this is agent #4271 calling you" signal.
2. **What the agent is allowed to spend.** A compromised or misaligned agent can drain its owner's wallet. x402 has no policy layer.
3. **How to stop an agent.** If an agent goes rogue, the owner has no on-chain switch. They rely on the agent's own code to obey a pause command — which a compromised agent ignores.
4. **Whether the agent is trustworthy.** The x402 spec has no reputation. Other agents have no signal beyond "this endpoint returned 200 last time".

In January 2026, **ERC-8004** ("Trustless Agents") shipped on Ethereum mainnet and Base. It defines three on-chain registries — Identity, Reputation, Validation — that solve (1) and (4). Base is already home to 17,600+ registered agents.

**PayGate is the missing glue: an x402 wrapper that binds every agent to an ERC-8004 identity, a per-agent SpendingPolicy contract, and a human-controlled kill switch.**

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Human Owner                              │
│   (sets limits, rotates wallet, presses kill switch)          │
└────────────────────┬─────────────────────────────────────────┘
                     │ one tx
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                PayGateRegistry (Base)                         │
│   - mints PayGate agentId                                     │
│   - deploys per-agent SpendingPolicy                          │
│   - binds: agentWallet ↔ policy ↔ owner ↔ ERC-8004 agentId    │
└────────────────────┬─────────────────────────────────────────┘
                     │ reads
                     ▼
┌──────────────────────────────────────────────────────────────┐
│        ERC-8004 Identity Registry (Base)                      │
│        0x8004A169FB4a3325136EB29fA0ceB6D2e539a432              │
│        - portable on-chain agent handle                       │
│        - 17,600+ agents already registered                    │
└────────────────────┬─────────────────────────────────────────┘
                     │ referenced
                     ▼
┌──────────────────────────────────────────────────────────────┐
│        SpendingPolicy (per agent)                             │
│   - perCallLimit  (e.g. $0.05 max per single x402 call)       │
│   - perEpochLimit (e.g. $5 per 24h)                           │
│   - allowlist     (whitelist of allowed counterparties)       │
│   - paused        (kill switch)                              │
└────────────────────┬─────────────────────────────────────────┘
                     │ enforced on every x402 settle
                     ▼
┌──────────────────────────────────────────────────────────────┐
│        x402 layer (Base, USDC, EIP-3009)                      │
│        - caller signs transferWithAuthorization               │
│        - facilitator settles on-chain                         │
│        - recordSpend() called on SpendingPolicy               │
└──────────────────────────────────────────────────────────────┘
```

## Repository layout

```
paygate/
├── contracts/        # PayGateRegistry + SpendingPolicy (Solidity 0.8.24, Hardhat)
│   ├── src/          # Solidity sources
│   ├── test/         # Forge tests
│   ├── scripts/      # Deploy, smoke test, balance check
│   └── artifacts/    # Compiled contracts
├── sdk/              # @paygate/sdk — TypeScript wrapper (wrap, call, register)
├── demo/             # 3-agent end-to-end demo (Express)
│   └── src/agents/   # Sentiment, Summarize, Translate
├── cli/              # paygate — terminal-native CLI
├── docs/             # ARCHITECTURE.md, SECURITY.md
├── public/           # Landing page (GitHub Pages)
├── DEPLOY.md         # How to redeploy
├── DEMO-SCRIPT.md    # 90-second video script
├── OPENARENA-FORM.md # Pre-filled submission form
└── X-POSTS.md        # 4 weeks of build-in-public posts
```

## Quick start

```bash
git clone https://github.com/Donyemiight/paygate
cd paygate
npm install --workspaces

# Deploy contracts to Base Sepolia (needs testnet ETH)
cd contracts
DEPLOYER_PRIVATE_KEY=0x... BASE_SEPOLIA_RPC=https://sepolia.base.org \
  npx hardhat run scripts/deploy.ts --network baseSepolia

# Run the demo
cd ../demo
REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
  AGENT_PRIVATE_KEY=0x... \
  npm start
# → http://localhost:3000
```

Then in another shell:

```bash
# Without payment → 402
curl -X POST http://localhost:3000/agents/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text":"PayGate is amazing!"}'
# {"x402Version":2,"accepts":[{"scheme":"exact",...,"maxAmountRequired":"20000",...}]}

# With PayGate SDK → 200
import { call, register, wrap } from "@paygate/sdk";
const result = await call(cfg, "http://localhost:3000/agents/summarize", {
  amount: 20000n, body: { text: "Long article..." },
});
```

## CLI

```bash
cd cli
npm run build
npm link

# Then globally:
export PAYGATE_PRIVATE_KEY=0x...
export PAYGATE_OWNER=0x...
export PAYGATE_REGISTRY=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A

paygate register --per-call 0.10 --per-epoch 1.00 --epoch 24h
paygate status
paygate pause
paygate resume
```

## Documentation

- **[DEPLOY.md](./DEPLOY.md)** — Re-deploy from scratch
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — Design deep-dive, security model
- **[docs/SECURITY.md](./docs/SECURITY.md)** — Threat model, mitigations, pre-mainnet audit recommendations
- **[DEMO-SCRIPT.md](./DEMO-SCRIPT.md)** — 90-second video script
- **[OPENARENA-FORM.md](./OPENARENA-FORM.md)** — Pre-filled submission form
- **[X-POSTS.md](./X-POSTS.md)** — 4 weeks of build-in-public X posts
- **[SUBMISSION.md](./SUBMISSION.md)** — Full submission packet

## Why this wins

1. **Novelty** — the first contract-enforced spending policy for x402. The first x402 wrapper with an on-chain kill switch.
2. **Live on testnet** — judges can verify on BaseScan. The smoke test runs in 4 seconds and passes 7/7.
3. **Standard-composed, not standard-replaced** — uses ERC-8004 as a *consumer*, not a competitor. Works for the 17,600+ existing agents.
4. **Security-first** — addresses all 5 known attacks on x402 (arXiv:2605.11781). Full threat model + audit recommendations in `docs/SECURITY.md`.
5. **Open source, MIT, single-binary deploy** — drop-in `wrap()` makes any async function a PayGate-protected agent in 5 lines.

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- Repo: https://github.com/Donyemiight/paygate
- Hackathon: BUIDL_QUESTS 2026, Sovereignty track
- Built by: O.A Dolapo
