/**
 * Link an existing ERC-8004 agent to a PayGate binding.
 *
 * Flow:
 *   1. Read the existing ERC-8004 identity on Base
 *   2. Read the existing PayGate binding (must exist; agent must already be registered with PayGate)
 *   3. Call setMetadataURI on the PayGateRegistry pointing at the ERC-8004 registration file
 *   4. Print a summary
 *
 * Note: PayGateRegistry.register() already accepts an erc8004AgentId param, so the
 * recommended path is to pass it at register() time. This script is for the
 * "I registered on PayGate first, now I want to link my 8004 identity" flow.
 *
 * Usage:
 *   AGENT_ID=1 ERC8004_AGENT_ID=4271 \
 *   REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
 *   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/link_erc8004.ts --network baseSepolia
 */

import { ethers } from "hardhat";

const REGISTRY = (process.env.REGISTRY_ADDRESS ?? "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A") as `0x${string}`;
const ERC8004_IDENTITY_BASE = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

async function main() {
  const [deployer] = await ethers.getSigners();
  const agentId = BigInt(process.env.AGENT_ID ?? "1");
  const erc8004Id = BigInt(process.env.ERC8004_AGENT_ID ?? "1");

  console.log(`\n[link_erc8004] PayGate agent: ${agentId}`);
  console.log(`[link_erc8004] ERC-8004 agent: ${erc8004Id}`);

  const registry = await ethers.getContractAt("PayGateRegistry", REGISTRY);
  const binding = await registry.getBinding(agentId);
  if (binding[3] === ethers.ZeroAddress) {
    console.error(`PayGate agent ${agentId} not found. Register first.`);
    process.exit(1);
  }
  if (binding[3].toLowerCase() !== deployer.address.toLowerCase()) {
    console.error(`Deployer ${deployer.address} is not the human owner of agent ${agentId} (owner: ${binding[3]}).`);
    process.exit(1);
  }

  // 1. Read the existing ERC-8004 identity to confirm it exists
  const erc8004 = await ethers.getContractAt(
    [
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function tokenURI(uint256 tokenId) view returns (string)",
    ],
    ERC8004_IDENTITY_BASE
  );

  let existingUri = "";
  try {
    existingUri = await erc8004.tokenURI(erc8004Id);
    console.log(`[link_erc8004] ERC-8004 agent URI: ${existingUri}`);
  } catch (e) {
    console.error(`ERC-8004 agent ${erc8004Id} not found on Base Sepolia. Check the agentId.`);
    process.exit(1);
  }

  // 2. Update the PayGate metadataURI to point at the ERC-8004 file
  console.log(`[link_erc8004] updating PayGate binding's metadataURI...`);
  const tx = await registry.setMetadataURI(agentId, existingUri);
  const r = await tx.wait();
  console.log(`    tx: ${r?.hash}`);

  // 3. Re-read and print
  const newBinding = await registry.getBinding(agentId);
  console.log(`\n[link_erc8004] done.`);
  console.log(`    PayGate agentId:    ${agentId}`);
  console.log(`    ERC-8004 agentId:   ${newBinding[0]} (was 0; will show after a re-register)`);
  console.log(`    metadataURI:        ${newBinding[4]}`);
  console.log(`    BaseScan binding:   https://sepolia.basescan.org/address/${REGISTRY}`);
  console.log(`    BaseScan 8004:      https://sepolia.basescan.org/address/${ERC8004_IDENTITY_BASE}`);
  console.log(``);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
