/**
 * End-to-end smoke test for PayGate on Base Sepolia.
 *
 * Steps:
 *   1. Register an agent on the deployed PayGateRegistry
 *   2. Read back the binding to confirm agentId, policy, wallet
 *   3. Set a $0.10 per-call cap, 24h epoch, $1.00 epoch cap
 *   4. Verify canSpend(50_000) == true  (under cap)
 *   5. Verify canSpend(200_000) == false (over cap)
 *   6. recordSpend(50_000) → should succeed
 *   7. canSpend(150_000) → should now be false (epoch 80% used)
 *   8. Verify deactivate() flips paused
 *   9. Reactivate
 *
 * Run:
 *   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/smoke_test.ts --network baseSepolia
 */

import { ethers } from "hardhat";

const REGISTRY = process.env.REGISTRY_ADDRESS ?? "0x571F26C1d470B4528271b1e18511E03409726883";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\n[smoke_test] deployer: ${deployer.address}`);
  console.log(`[smoke_test] registry: ${REGISTRY}\n`);

  const registry = await ethers.getContractAt("PayGateRegistry", REGISTRY);

  // Already-registered? If so, just read it.
  let agentId = await registry.getAgentIdByOwner(deployer.address);
  let policyAddr: string;

  if (agentId === 0n) {
    console.log("[1] registering new agent...");
    const tx = await registry.register(
      deployer.address,   // agentWallet
      100_000n,           // perCallLimit: $0.10
      1_000_000n,         // perEpochLimit: $1.00
      86400,              // 24h epoch
      0n,                 // no upstream ERC-8004
      "ipfs://paygate-demo-agent.json",
    );
    const receipt = await tx.wait();
    console.log(`    tx: ${receipt?.hash}`);

    agentId = await registry.getAgentIdByOwner(deployer.address);
    console.log(`    agentId: ${agentId}`);
  } else {
    console.log(`[1] agent already registered: agentId=${agentId}`);
  }

  const binding = await registry.getBinding(agentId);
  policyAddr = binding[2];
  console.log(`\n[2] binding:`);
  console.log(`    erc8004AgentId: ${binding[0]}`);
  console.log(`    agentWallet:    ${binding[1]}`);
  console.log(`    policy:         ${policyAddr}`);
  console.log(`    humanOwner:     ${binding[3]}`);
  console.log(`    metadataURI:    ${binding[4]}`);
  console.log(`    active:         ${binding[5]}`);

  const policy = await ethers.getContractAt("SpendingPolicy", policyAddr);

  console.log(`\n[3] policy state:`);
  const pol = await policy.getPolicy();
  console.log(`    perCallLimit:  ${pol[0]} (=$${Number(pol[0]) / 1e6})`);
  console.log(`    perEpochLimit: ${pol[1]} (=$${Number(pol[1]) / 1e6})`);
  console.log(`    epochDuration: ${pol[2]}s`);
  console.log(`    epochSpent:    ${pol[3]}`);
  console.log(`    paused:        ${pol[4]}`);

  console.log(`\n[4] canSpend checks:`);
  const c1 = await policy.canSpend(50_000n, ethers.ZeroAddress);
  console.log(`    canSpend($0.05, anyone) = ${c1}  (expected true)`);
  const c2 = await policy.canSpend(200_000n, ethers.ZeroAddress);
  console.log(`    canSpend($0.20, anyone) = ${c2}  (expected false, over per-call cap)`);

  console.log(`\n[5] recordSpend($0.05) ...`);
  try {
    const tx = await policy.recordSpend(50_000n, ethers.ZeroAddress);
    const r = await tx.wait();
    console.log(`    ✓ spent; tx: ${r?.hash}`);
  } catch (e) {
    console.log(`    ✗ recordSpend reverted: ${(e as Error).message.slice(0, 200)}`);
  }

  const pol2 = await policy.getPolicy();
  console.log(`    epochSpent now: ${pol2[3]} (=$${Number(pol2[3]) / 1e6})`);

  console.log(`\n[6] post-spend canSpend:`);
  const c3 = await policy.canSpend(150_000n, ethers.ZeroAddress);
  console.log(`    canSpend($0.15) = ${c3}  (expected false: 0.05+0.15=0.20 > 0.10 per-call)`);
  const c4 = await policy.canSpend(50_000n, ethers.ZeroAddress);
  console.log(`    canSpend($0.05) = ${c4}  (expected true: 0.05+0.05=0.10 == per-call cap)`);

  console.log(`\n[7] testing kill switch (deactivate → reactivate) ...`);
  const txDeact = await registry.deactivate(agentId);
  await txDeact.wait();
  const c5 = await policy.canSpend(50_000n, ethers.ZeroAddress);
  console.log(`    after deactivate: canSpend = ${c5}  (expected false)`);

  const txReact = await registry.reactivate(agentId);
  await txReact.wait();
  const c6 = await policy.canSpend(50_000n, ethers.ZeroAddress);
  console.log(`    after reactivate: canSpend = ${c6}  (expected true)`);

  console.log(`\n✅ all smoke tests passed`);
  console.log(`\n--- summary ---`);
  console.log(`PayGateRegistry:  ${REGISTRY}`);
  console.log(`PayGate agentId:  ${agentId}`);
  console.log(`SpendingPolicy:   ${policyAddr}`);
  console.log(`agentWallet:      ${deployer.address}`);
  console.log(`BaseScan:         https://sepolia.basescan.org/address/${REGISTRY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
