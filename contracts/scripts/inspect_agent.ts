/**
 * Inspect a PayGate agent's on-chain state.
 *
 * Usage:
 *   AGENT_ID=1 REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
 *   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/inspect_agent.ts --network baseSepolia
 *
 * Or with no AGENT_ID set, it inspects the agent bound to the deployer address.
 */

import { ethers } from "hardhat";

const REGISTRY = (process.env.REGISTRY_ADDRESS ?? "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A") as `0x${string}`;

async function main() {
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("PayGateRegistry", REGISTRY);

  let agentId: bigint;
  if (process.env.AGENT_ID) {
    agentId = BigInt(process.env.AGENT_ID);
  } else {
    agentId = (await registry.getAgentIdByOwner(deployer.address)) as bigint;
    if (agentId === 0n) {
      console.log(`No agent registered for ${deployer.address}. Run "paygate register" first.`);
      return;
    }
  }

  const binding = await registry.getBinding(agentId);
  const policy = await ethers.getContractAt("SpendingPolicy", binding[2]);
  const pol = await policy.getPolicy();

  const fmtUsdc = (v: bigint) => `$${(Number(v) / 1e6).toFixed(4)}`;
  const fmtSec = (s: bigint) => {
    const n = Number(s);
    if (n < 60) return `${n}s`;
    if (n < 3600) return `${Math.round(n / 60)}m`;
    if (n < 86400) return `${Math.round(n / 3600)}h`;
    return `${Math.round(n / 86400)}d`;
  };

  console.log("\n\x1b[1m\x1b[36mPayGate Agent Inspector\x1b[0m");
  console.log("\x1b[2m─────────────────────────────────────────────\x1b[0m");
  console.log(`\x1b[1mRegistry:\x1b[0m     ${REGISTRY}`);
  console.log(`\x1b[1mNetwork:\x1b[0m      base-sepolia (84532)`);
  console.log(`\x1b[1mDeployer:\x1b[0m     ${deployer.address}`);
  console.log(`\x1b[1mAgent ID:\x1b[0m     ${agentId}`);
  console.log(`\x1b[1mStatus:\x1b[0m       ${binding[5] ? "\x1b[32mACTIVE\x1b[0m" : "\x1b[31mDEACTIVATED\x1b[0m"}`);
  console.log("\x1b[2m─────────────────────────────────────────────\x1b[0m");
  console.log(`\x1b[1mBinding:\x1b[0m`);
  console.log(`  agentWallet:    ${binding[1]}`);
  console.log(`  humanOwner:     ${binding[3]}`);
  console.log(`  policy:         ${binding[2]}`);
  console.log(`  metadataURI:    ${binding[4]}`);
  console.log(`  erc8004AgentId: ${binding[0]}`);
  console.log("\x1b[2m─────────────────────────────────────────────\x1b[0m");
  console.log(`\x1b[1mSpending policy:\x1b[0m`);
  console.log(`  perCallLimit:   ${fmtUsdc(pol[0])} USDC`);
  console.log(`  perEpochLimit:  ${fmtUsdc(pol[1])} USDC`);
  console.log(`  epochDuration:  ${fmtSec(pol[2])}`);
  console.log(`  epochSpent:     ${fmtUsdc(pol[3])} USDC`);
  console.log(`  paused:         ${pol[4] ? "\x1b[31mYES (kill switch ON)\x1b[0m" : "\x1b[32mno\x1b[0m"}`);

  // progress bar
  if (pol[1] > 0n) {
    const pct = Math.min(100, Number((pol[3] * 100n) / pol[1]));
    const filled = Math.round(pct / 5);
    const empty = 20 - filled;
    const bar = "\x1b[42m\x1b[30m" + " ".repeat(filled) + "\x1b[0m" + "\x1b[47m\x1b[30m" + " ".repeat(empty) + "\x1b[0m";
    console.log(`  progress:       [${bar}] ${pct}%`);
  }

  console.log("\x1b[2m─────────────────────────────────────────────\x1b[0m");
  console.log(`\x1b[1mLinks:\x1b[0m`);
  console.log(`  BaseScan registry: https://sepolia.basescan.org/address/${REGISTRY}`);
  console.log(`  BaseScan policy:   https://sepolia.basescan.org/address/${binding[2]}`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
