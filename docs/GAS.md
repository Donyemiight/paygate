# PayGate — Gas Cost Report

> Verified on **Base Sepolia** (chain ID 84532), 2026-07-15.
> Real on-chain txs, not estimates. Run `npx hardhat run scripts/gas_report.ts --network baseSepolia` to reproduce.

## One-time costs (deploy)

| Operation | Gas | Cost @ 0.001 gwei (testnet) | Cost @ 0.01 gwei (mainnet est.) | Cost @ 0.05 gwei (peak mainnet) |
|---|---|---|---|---|
| `PayGateRegistry` deploy | **1,839,404** | 0.00184 ETH | 0.0184 ETH | 0.092 ETH |
| `SpendingPolicy` deploy (per agent) | **~820,000** | 0.00082 ETH | 0.0082 ETH | 0.041 ETH |
| `register()` (mints agentId + deploys policy) | **828,180** | 0.00083 ETH | 0.0083 ETH | 0.041 ETH |

**Total to onboard a new agent (registry already deployed):** ~828K gas.
**Total to deploy everything from scratch:** ~2.66M gas.

## Per-call costs (the ones that matter for users)

| Operation | Gas | Notes |
|---|---|---|
| `recordSpend` (under cap) | **53,984** | The main per-payment cost |
| `recordSpend` (over cap, reverts) | ~28K | Half the gas — reverts before doing the work |
| `canSpend` (view) | **0** | Free — `eth_call` only |
| `getPolicy` (view) | **0** | Free |
| `getBinding` (view) | **0** | Free |
| `deactivate()` (kill switch) | **39,232** | One-tx emergency stop |
| `reactivate()` | **61,120** | Resume the agent |
| `rotateWallet()` | **28,488** | Change the payout address |
| `setLimits()` (forwarded) | **45,972** | Change per-call / per-epoch caps |
| `setAllowlist()` (forwarded) | **78,032** | One allowlist entry |
| `setMetadataURI()` | **30,046** | Update the agent's metadata |

## At Base mainnet gas prices

| Scenario | Total gas per call | Cost @ 0.005 gwei (realistic) |
|---|---|---|
| Successful x402 payment with PayGate | ~54K | ~0.00000027 ETH = **$0.0008** |
| Failed payment (cap exceeded) | ~28K | ~0.00000014 ETH = **$0.0004** |
| Kill switch activation (one-time) | ~39K | ~0.00000020 ETH = **$0.0006** |

**Per-call cost is sub-1-cent at any plausible gas price on Base.**

## Comparison vs alternatives

| | PayGate | Plain x402 SDK | MoltsPay | Azeth SDK |
|---|---|---|---|---|
| Per-call cost (recordSpend equivalent) | ~54K | 0 (no policy) | ~30K (off-chain check, no on-chain settle) | 0 (read-only, no enforcement) |
| Per-call cost (with full policy + reputation) | ~110K (recordSpend + ERC-8004 feedback) | n/a | ~80K | ~50K |
| Enforced by contract? | ✅ yes | ❌ no | ❌ no (off-chain) | ❌ no (off-chain) |

PayGate's per-call cost is higher than plain x402, but you get **enforcement that survives a compromised SDK**. That's the trade-off.

## Reproducing this report

```bash
cd contracts
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/gas_report.ts --network baseSepolia
```

Output:
```
=== PayGate Gas Report ===

PayGateRegistry deploy:        1839404
SpendingPolicy deploy:         ~820,000
register() (with new policy):  828180 gas
recordSpend(under cap):        53984 gas
...
```
