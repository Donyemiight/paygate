# PayGate — Judges' Quickstart (60 seconds)

> If you have 60 seconds, this is the only doc you need.
> Everything below is copy-pasteable. No reading required.

## 1. The contract (already live)

```
PayGateRegistry:  0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A  (Base Sepolia)
BaseScan:         https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A
```

You can read the contract state right now in any BaseScan tab. There is **one** agent registered (agentId 1) with a working spending policy and a kill switch.

## 2. Run the integration test (already passes)

```bash
git clone https://github.com/Donyemiight/paygate
cd paygate/contracts
npm install
DEPLOYER_PRIVATE_KEY=0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2 \
  npx hardhat run scripts/integration_test.ts --network baseSepolia
```

Expected output: `13 passed, 0 failed`. This exercises the deployed contract end-to-end (register, recordSpend, kill switch, reactivate). Real on-chain transactions.

## 3. Run the unit tests (already passes)

```bash
npx hardhat test
```

Expected: `13 passing`. Covers register, double-register rejection, zero-wallet rejection, wallet rotation, kill switch, all `canSpend`/`recordSpend` revert paths.

## 4. Run the Foundry tests (also passes)

```bash
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge test -vvv
```

Expected: 13 passing.

## 5. Inspect the live agent (read-only)

```bash
DEPLOYER_PRIVATE_KEY=0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2 \
  AGENT_ID=1 \
  npx hardhat run scripts/inspect_agent.ts --network baseSepolia
```

Expected: a colored ASCII report with progress bar, status, BaseScan links.

## 6. Run the demo (needs a test wallet with USDC)

```bash
cd ../demo
npm install
REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
  AGENT_PRIVATE_KEY=0x... \
  npm start
# → http://localhost:3000
```

You should see a 3-agent demo (Sentiment, Summarizer, Translate) with a "Kill switch" button.

## 7. Hit the kill switch

In the demo dashboard:
1. Type a prompt in the orchestrator
2. Click "Run all 3 agents" — see the responses + settlement tx hashes
3. Click "Kill switch (deactivate)" — the button changes to "Resume"
4. Click "Run all 3 agents" again — the paid calls now fail (policy says no)
5. Click "Resume" — the agent is back

That's the entire pitch in 5 clicks.

## 8. Read the 1-page security summary (1 minute)

Open `docs/SECURITY-ONE-PAGE.pdf` in any PDF viewer. It covers:
- Threat model
- 5 known x402 attacks + PayGate's mitigations
- Smart contract security controls
- Pre-mainnet audit recommendations

## 9. Watch the demo video (90 seconds)

[YouTube link will go here once recorded]

## What PayGate is, in one line

A drop-in wrapper for the x402 agent-payment standard that adds three primitives x402 doesn't have: **on-chain identity (ERC-8004), on-chain spending policy, and a one-transaction kill switch**.

## Why this wins

- **Novelty** — first contract-enforced spending policy + kill switch for x402
- **Standard-composed** — uses ERC-8004 as a consumer, not a competitor
- **Security-first** — mitigates all 5 known x402 attacks (arXiv:2605.11781)
- **Live on testnet** — you can verify it right now
- **MIT licensed** — no IP traps
- **3-line integration** — `import { wrap } from "@paygate/sdk"; app.post("/api", wrap(cfg, fn, { priceUSDC: 10000n }));`

## Where to go next

| If you want to... | Read this |
|---|---|
| Understand the architecture | `docs/ARCHITECTURE.md` |
| See the security details | `docs/SECURITY.md` (full) or `docs/SECURITY-ONE-PAGE.pdf` (1 page) |
| Pitch deck for the interview | `docs/PITCH-DECK.pdf` |
| See the comparison vs other x402 SDKs | `README.md` (comparison table) |
| Use PayGate in your own x402 service | `README.md` (Quick start) + `sdk/src/wrap.ts` |
| See the kill switch rationale | `public/why.html` (4 scenarios) |
| See the 5 attacks + fixes | `public/attacks.html` |
| Submit a security disclosure | `SECURITY.md` |
| Contribute | `CONTRIBUTING.md` |
| Check the gas costs | `docs/GAS.md` |
| See the roadmap | `ROADMAP.md` |
| Get FAQ answers | `docs/FAQ.md` |

Total docs in this repo: **13 markdown files + 2 PDFs + 3 HTML pages**. Everything you'd want to evaluate PayGate is in this repo.
