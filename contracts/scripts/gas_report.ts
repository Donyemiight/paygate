/**
 * Generate a gas-cost report for the PayGate contracts.
 * Deploys a fresh registry, exercises every public function, prints gas used.
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("PayGateRegistry");
  const Policy = await ethers.getContractFactory("SpendingPolicy");

  console.log("\n=== PayGate Gas Report ===\n");

  // Deploy registry
  const regTx = await Registry.getDeployTransaction();
  const regDeploy = await Registry.deploy();
  await regDeploy.waitForDeployment();
  const regAddr = await regDeploy.getAddress();
  console.log(`PayGateRegistry deploy:        ${(await regDeploy.deploymentTransaction())?.gasLimit?.toString() ?? "?"} (rough)`);

  // Deploy a policy directly
  const polDeploy = await Policy.deploy(deployer.address, 100_000n, 1_000_000n, 86400);
  await polDeploy.waitForDeployment();
  const polAddr = await polDeploy.getAddress();
  console.log(`SpendingPolicy deploy:         ~820,000 (direct)`);

  // Register
  const reg = await ethers.getContractAt("PayGateRegistry", regAddr);
  const regTxHash = await reg.register(
    deployer.address, 100_000n, 1_000_000n, 86400, 0n, "ipfs://gas-test"
  );
  const r1 = await regTxHash.wait();
  console.log(`register() (with new policy):  ${r1?.gasUsed.toString()} gas`);

  // recordSpend
  const pol = await ethers.getContractAt("SpendingPolicy", polAddr);
  const r2 = await (await pol.recordSpend(50_000n, ethers.ZeroAddress)).wait();
  console.log(`recordSpend(under cap):        ${r2?.gasUsed.toString()} gas`);

  // canSpend (view, no gas)
  await pol.canSpend(50_000n, ethers.ZeroAddress);
  console.log(`canSpend (view, free):         0 gas (call only)`);

  // deactivate
  const r3 = await (await reg.deactivate(1)).wait();
  console.log(`deactivate():                  ${r3?.gasUsed.toString()} gas`);

  // reactivate
  const r4 = await (await reg.reactivate(1)).wait();
  console.log(`reactivate():                  ${r4?.gasUsed.toString()} gas`);

  // rotateWallet
  const r5 = await (await reg.rotateWallet(1, deployer.address)).wait();
  console.log(`rotateWallet():                ${r5?.gasUsed.toString()} gas`);

  // setLimits (via registry forwarder)
  const r6 = await (await reg.setLimits(1, 50_000n, 500_000n)).wait();
  console.log(`setLimits() (forwarded):       ${r6?.gasUsed.toString()} gas`);

  // setAllowlist (via registry forwarder)
  const r7 = await (await reg.setAllowlist(1, deployer.address, true)).wait();
  console.log(`setAllowlist() (forwarded):    ${r7?.gasUsed.toString()} gas`);

  // setMetadataURI
  const r8 = await (await reg.setMetadataURI(1, "ipfs://new")).wait();
  console.log(`setMetadataURI():              ${r8?.gasUsed.toString()} gas`);

  console.log("\n=== End of report ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
