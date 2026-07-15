/**
 * Deploy script for PayGate contracts to Base Sepolia (or mainnet).
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... BASE_SEPOLIA_RPC=https://... \
 *     npx hardhat run scripts/deploy.ts --network baseSepolia
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`[PayGate] deploying with ${deployer.address}`);
  console.log(`[PayGate] balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  const Registry = await ethers.getContractFactory("PayGateRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`[PayGate] PayGateRegistry deployed to: ${registryAddress}`);

  // Verify on BaseScan (only if API key set)
  if (process.env.BASESCAN_API_KEY) {
    console.log(`[PayGate] waiting 30s before verification...`);
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await hre.run("verify:verify", { address: registryAddress, constructorArguments: [] });
      console.log(`[PayGate] verified on BaseScan ✓`);
    } catch (e) {
      console.warn(`[PayGate] verification failed: ${(e as Error).message}`);
    }
  }

  console.log(`\n[PayGate] Next steps:`);
  console.log(`  export REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`  cd ../demo && REGISTRY_ADDRESS=${registryAddress} npm run dev`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
