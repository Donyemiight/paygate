# Deployment

## ✅ Live on Base Sepolia

| Contract | Address | BaseScan |
|---|---|---|
| **PayGateRegistry** | `0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A` | [View ↗](https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A) |

- **Deployer:** `0xb859C2038e8b1A3AE678DEEB6D1424FaF439c7EF`
- **Chain ID:** 84532 (Base Sepolia)
- **Deployed:** 2026-07-15
- **Solidity:** 0.8.24, optimizer 200 runs
- **OpenZeppelin:** 5.x (uses `Ownable(msg.sender)` constructor pattern)

## Re-deploy from scratch

You need:
- ~0.01 Base Sepolia ETH in the deployer wallet
- A private key exported as `DEPLOYER_PRIVATE_KEY` env var
- (Optional) `BASESCAN_API_KEY` for source verification

### Using Hardhat

```bash
cd contracts
npm install
DEPLOYER_PRIVATE_KEY=0x... BASE_SEPOLIA_RPC=https://sepolia.base.org \
  npx hardhat run scripts/deploy.ts --network baseSepolia
```

Output:
```
[PayGate] PayGateRegistry deployed to: 0x...
```

Copy that address, then verify on BaseScan:

```bash
DEPLOYER_PRIVATE_KEY=0x... BASESCAN_API_KEY=... \
  npx hardhat verify --network baseSepolia 0x...
```

### Using Forge (faster)

```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
forge create --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  src/PayGateRegistry.sol:PayGateRegistry
```

## Using the deployed registry

```typescript
// sdk/src/register.ts returns the deployed addresses
import { register } from "@paygate/sdk";

const reg = await register({
  registryAddress: "0x571F26C1d470B4528271b1e18511E03409726883",
  // ... other config
}, {
  perCallLimit: 100_000n,   // $0.10
  perEpochLimit: 1_000_000n, // $1.00
  epochDuration: 86400,      // 24h
});

console.log("PayGate agentId:", reg.paygateAgentId);
console.log("SpendingPolicy:", reg.policyAddress);
```

## Cost breakdown (Base Sepolia, 0.8.24)

| Step | Gas | Cost @ 0.001 gwei |
|---|---|---|
| Deploy `PayGateRegistry` | ~1.2M | ~0.0012 ETH |
| Deploy `SpendingPolicy` (per register) | ~800K | ~0.0008 ETH |
| `register()` call | ~250K | ~0.00025 ETH |
| **Full demo: 1 registry + 2 policies + 2 registers** | **~2.3M** | **~0.0023 ETH** |

0.01 ETH is more than enough headroom. 0.005 ETH (what we deployed with) was tight but worked.
