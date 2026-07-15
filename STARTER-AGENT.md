# PayGate — Starter Agent (copy-paste)

> A minimal PayGate-protected agent in ~30 lines.
> Use this as a starting point for your own agent.

## Full example

```typescript
// starter.ts — a PayGate-protected agent that charges $0.01 per "fortune" call
import express from "express";
import { wrap, register } from "@paygate/sdk";

const REGISTRY = "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A";
const RPC = "https://sepolia.base.org";

const config = {
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY! as `0x${string}`,
  ownerAddress: process.env.OWNER_ADDRESS! as `0x${string}`,
  registryAddress: REGISTRY as `0x${string}`,
  usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  facilitatorUrl: "https://www.x402.org/facilitator",
  rpcUrl: RPC,
  chainId: 84532 as const,
};

// (1) Register the agent once. Run this on first deploy, then remove.
async function main() {
  if (process.argv.includes("--register")) {
    const reg = await register(config, {
      perCallLimit: 100_000n,   // $0.10 per call
      perEpochLimit: 1_000_000n, // $1.00 per day
      epochDuration: 86400,
    });
    console.log("Registered:", reg);
    return;
  }

  // (2) Wrap any async function as a PayGate-protected endpoint
  const fortuneHandler = wrap(
    config,
    async (input: { mood: "happy" | "sad" | "neutral" }) => {
      const fortunes = {
        happy: "Today is your day. Own it.",
        sad: "Tomorrow will be different. Trust the process.",
        neutral: "The answer is inside you. Sit with it.",
      };
      return { fortune: fortunes[input.mood] ?? "..." };
    },
    { priceUSDC: 10000n /* $0.01 */, resource: "/fortune" }
  );

  // (3) Standard Express setup
  const app = express();
  app.use(express.json());
  app.post("/fortune", fortuneHandler);
  app.listen(3000, () => console.log("listening on :3000"));
}

main();
```

## Run it

```bash
# 1. Install
npm install @paygate/sdk express

# 2. Set env
export AGENT_PRIVATE_KEY=0x...   # test wallet with USDC
export OWNER_ADDRESS=0x...        # your address

# 3. Register the agent on-chain (one-time)
npx ts-node starter.ts --register

# 4. Start the server
npx ts-node starter.ts
```

## Test it

```bash
# Without payment → 402
curl -X POST http://localhost:3000/fortune \
  -H "Content-Type: application/json" \
  -d '{"mood":"happy"}'

# With PayGate SDK → 200
import { call } from "@paygate/sdk";
const result = await call(config, "http://localhost:3000/fortune", {
  amount: 10000n,
  body: { mood: "happy" },
});
console.log(result.data); // { fortune: "Today is your day. Own it." }
```

## How it works

1. **On `POST /fortune`**, PayGate checks if the request has an x402 payment header.
2. **No payment** → returns 402 with payment requirements.
3. **With payment** → PayGate calls the x402 facilitator, settles the USDC on-chain, then runs your handler.
4. **After the call**, PayGate records the spend on the agent's SpendingPolicy contract, which reverts if the cap is exceeded.
5. **Anytime**, the human owner can call `registry.deactivate(agentId)` to pause the agent. The next call reverts.

## Going further

- See `sdk/src/wrap.ts` for all options
- See `docs/ARCHITECTURE.md` for the full data flow
- See `DEMO-SCRIPT.md` for a 90s video walkthrough
- See `ROADMAP.md` for what's coming in v0.2

## Common gotchas

1. **The `OWNER_ADDRESS` ≠ `AGENT_PRIVATE_KEY`'s address.** The owner is the human who can pause the agent; the agent's wallet is what holds USDC. In production, use two separate wallets.
2. **The agent wallet must have USDC.** Get testnet USDC from https://faucet.circle.com (Base Sepolia).
3. **The first call after deploy can be slow.** The facilitator may take a few seconds to settle on a fresh chain. Subsequent calls are faster.
4. **402 → 200 → settlement.** The settlement tx is in the response header `X-PayGate-Settlement`. Save it for the audit trail.
