# PayGate

> **A sovereign payment + identity layer for AI agents.**
> x402 payments on Base · ERC-8004 identity · on-chain spending policy · human-controlled kill switch.

[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![BUIDL_QUESTS 2026](https://img.shields.io/badge/BUIDL_QUESTS-2026-7c5cff)]()
[![Sovereignty Track](https://img.shields.io/badge/track-Sovereignty-22c55e)]()
[![Base Sepolia](https://img.shields.io/badge/Base-Sepolia-0052ff)]()
[![ERC-8004](https://img.shields.io/badge/ERC--8004-identity-22c55e)]()

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

## Demo

```
$ npm run dev
# → http://localhost:3000
```

The demo runs two agents on the same process (in production each is its own service):

- `POST /agents/sentiment` — charges $0.01 USDC per call
- `POST /agents/summarize` — charges $0.02 USDC per call
- `GET /` — owner dashboard with kill switch UI

Live on Base Sepolia (USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`).

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

## What's new vs. existing x402 SDKs

| Feature | `x402` (Coinbase official) | `Azeth SDK` | `MoltsPay` | **PayGate** |
|---|---|---|---|---|
| x402 payment flow | ✅ | ✅ | ✅ | ✅ |
| ERC-8004 identity binding | ❌ | ✅ (read-only) | ❌ | ✅ **+ on-chain link** |
| On-chain spending policy | ❌ | ❌ | ✅ (off-chain) | ✅ **enforced by contract** |
| Human kill switch | ❌ | ❌ | ❌ | ✅ **one tx, irreversible** |
| Reputation feedback per call | ❌ | ✅ (manual) | ❌ | ✅ **automatic** |
| Known-attack mitigations | n/a | partial | partial | ✅ **all 5 (arXiv 2605.11781)** |
| Single-file SDK | ✅ | ❌ | ❌ | ✅ **drop-in `wrap()`** |

Concretely, PayGate fixes the **five known attacks on x402** identified in the May 2026 arXiv paper *Five Attacks on x402 Agentic Payment Protocol*:

1. **Grant-before-settle** → we settle via facilitator BEFORE running the handler.
2. **Missing resource-identifier binding** → payment requirement is bound to the exact request path.
3. **Fire-and-forget settlement** → we wait for the receipt and write the on-chain policy update.
4. **Missing `Cache-Control` headers** → every 402 response includes `Cache-Control: no-store`.
5. **Replay** → the EIP-3009 nonce is unique per request, and the SpendingPolicy's epoch counter caps reuse.

## Quick start

```bash
git clone https://github.com/ademidun69/paygate
cd paygate
npm install --workspaces

# Deploy contracts to Base Sepolia
cd contracts
npm run deploy:sepolia
# → save REGISTRY_ADDRESS=0x...

# Run the demo
cd ../demo
REGISTRY_ADDRESS=0x... AGENT_PRIVATE_KEY=0x... npm run dev
# → http://localhost:3000
```

Then in another shell:

```bash
# Without payment → 402
curl -X POST http://localhost:3000/agents/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text":"PayGate is amazing!"}'
# {"x402Version":2,"accepts":[{"scheme":"exact",...,"maxAmountRequired":"10000",...}]}

# With PayGate SDK → 200
import { call, loadConfig } from "@paygate/sdk";
const cfg = loadConfig();
const result = await call(cfg, "http://localhost:3000/agents/sentiment", {
  amount: 10000n,
  body: { text: "PayGate is amazing!" },
});
console.log(result.data); // { sentiment: "positive", score: 1, length: 21 }
console.log(result.settlementTx); // 0x... on Base Sepolia
```

## Repository layout

```
paygate/
├── contracts/        # PayGateRegistry + SpendingPolicy (Solidity, Hardhat)
├── sdk/              # @paygate/sdk — TypeScript wrapper (wrap, call, register)
├── demo/             # 2-agent end-to-end demo (Express)
├── docs/             # Architecture deep-dive
└── scripts/          # Deploy, feedback, query helpers
```

## The 28-day build plan

| Week | Milestone |
|---|---|
| **W1** (Jul 16–22) | Contracts: `PayGateRegistry` + `SpendingPolicy`. Tests pass. Deploy to Base Sepolia. |
| **W2** (Jul 23–29) | SDK: `register()`, `wrap()`, `call()`. Auto-reputation feedback. |
| **W3** (Jul 30–Aug 5) | Demo: 2 agents, owner dashboard, kill switch UI. |
| **W4** (Aug 6–12) | Video, README, OpenArena submission. Build-in-public posts. |

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- Repo: https://github.com/ademidun69/paygate
- Hackathon: BUIDL_QUESTS 2026, Sovereignty track
- Built by: O.A Dolapo
