/**
 * Hardhat tests for PayGate — the canonical test suite.
 *
 * Run:
 *   npx hardhat test
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import type { PayGateRegistry, SpendingPolicy } from "../typechain-types";

const ZERO = "0x0000000000000000000000000000000000000000";
const ALICE = "0x" + "11".repeat(20);
const BOB = "0x" + "22".repeat(20);

describe("PayGateRegistry", () => {
  let registry: PayGateRegistry;
  let deployer: any, alice: any, bob: any;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PayGateRegistry");
    registry = await Factory.deploy();
  });

  it("registers a new agent and deploys a policy", async () => {
    const tx = await registry.connect(alice).register(
      bob.address,           // agentWallet
      100_000,               // $0.10 per call
      1_000_000,             // $1.00 per epoch
      86400,                 // 24h epoch
      0,                     // no ERC-8004 id
      "ipfs://test"
    );
    const r = await tx.wait();

    const agentId = await registry.getAgentIdByOwner(alice.address);
    expect(agentId).to.equal(1);

    const binding = await registry.getBinding(1);
    expect(binding.agentWallet).to.equal(bob.address);
    expect(binding.humanOwner).to.equal(alice.address);
    expect(binding.active).to.equal(true);
    expect(binding.metadataURI).to.equal("ipfs://test");
    expect(binding.policy).to.not.equal(ZERO);

    // event emitted
    expect(r!.logs.length).to.be.greaterThan(0);
  });

  it("rejects double registration by the same owner", async () => {
    await registry.connect(alice).register(bob.address, 100, 1000, 60, 0, "");
    await expect(
      registry.connect(alice).register(bob.address, 100, 1000, 60, 0, "")
    ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
  });

  it("rejects zero wallet", async () => {
    await expect(
      registry.connect(alice).register(ZERO, 100, 1000, 60, 0, "")
    ).to.be.revertedWithCustomError(registry, "InvalidWallet");
  });

  it("rotates the agent wallet (only by owner)", async () => {
    await registry.connect(alice).register(bob.address, 100, 1000, 60, 0, "");
    await registry.connect(alice).rotateWallet(1, alice.address);
    const binding = await registry.getBinding(1);
    expect(binding.agentWallet).to.equal(alice.address);

    await expect(
      registry.connect(bob).rotateWallet(1, bob.address)
    ).to.be.revertedWithCustomError(registry, "NotAgentOwner");
  });

  it("deactivate pauses the policy and reactivate restores it", async () => {
    await registry.connect(alice).register(bob.address, 100, 1000, 60, 0, "");
    const binding = await registry.getBinding(1);
    const policy = await ethers.getContractAt("SpendingPolicy", binding.policy);

    expect((await policy.getPolicy())[4]).to.equal(false); // not paused
    await registry.connect(alice).deactivate(1);
    expect((await policy.getPolicy())[4]).to.equal(true);
    const b2 = await registry.getBinding(1);
    expect(b2.active).to.equal(false);

    await registry.connect(alice).reactivate(1);
    expect((await policy.getPolicy())[4]).to.equal(false);
    const b3 = await registry.getBinding(1);
    expect(b3.active).to.equal(true);
  });
});

describe("SpendingPolicy", () => {
  let policy: SpendingPolicy;
  let alice: any, bob: any;

  beforeEach(async () => {
    [alice, bob] = await ethers.getSigners();
    // For testing, alice is BOTH the policy owner (via constructor) and the registry caller.
    // We deploy the policy directly here for unit tests.
    const Factory = await ethers.getContractFactory("SpendingPolicy");
    policy = await Factory.deploy(alice.address, 100_000, 1_000_000, 86400);
  });

  it("canSpend: returns true under caps", async () => {
    expect(await policy.canSpend(50_000, ZERO)).to.equal(true);
    expect(await policy.canSpend(100_000, ZERO)).to.equal(true);
  });

  it("canSpend: returns false over per-call cap", async () => {
    expect(await policy.canSpend(100_001, ZERO)).to.equal(false);
    expect(await policy.canSpend(200_000, ZERO)).to.equal(false);
  });

  it("canSpend: returns false when paused", async () => {
    await policy.connect(alice).setPaused(true);
    expect(await policy.canSpend(1, ZERO)).to.equal(false);
  });

  it("recordSpend: reverts over per-call cap", async () => {
    await expect(
      policy.connect(alice).recordSpend(200_000, ZERO)
    ).to.be.revertedWithCustomError(policy, "ExceedsPerCallLimit");
  });

  it("recordSpend: reverts when paused", async () => {
    await policy.connect(alice).setPaused(true);
    await expect(
      policy.connect(alice).recordSpend(50_000, ZERO)
    ).to.be.revertedWithCustomError(policy, "Paused_");
  });

  it("recordSpend: tracks epoch spend correctly", async () => {
    // first raise per-call cap so we can record 800_000 in a single tx
    await policy.connect(alice).setLimits(900_000, 1_000_000);
    await policy.connect(alice).recordSpend(800_000, ZERO);
    let pol = await policy.getPolicy();
    expect(pol[3]).to.equal(800_000); // epochSpent

    // Under cap, allowed
    expect(await policy.canSpend(200_000, ZERO)).to.equal(true);
    // Over cap, blocked
    expect(await policy.canSpend(200_001, ZERO)).to.equal(false);

    // Recording over cap reverts
    await expect(
      policy.connect(alice).recordSpend(200_001, ZERO)
    ).to.be.revertedWithCustomError(policy, "ExceedsPerEpochLimit");
  });

  it("setLimits: only owner", async () => {
    await expect(
      policy.connect(bob).setLimits(50, 500)
    ).to.be.revertedWithCustomError(policy, "NotOwner");
  });

  it("allowlist: open by default, strict after first true entry", async () => {
    expect(await policy.canSpend(1, "0x" + "33".repeat(20))).to.equal(true);
    await policy.connect(alice).setAllowlist("0x" + "33".repeat(20), true);
    expect(await policy.canSpend(1, "0x" + "33".repeat(20))).to.equal(true);
    expect(await policy.canSpend(1, "0x" + "44".repeat(20))).to.equal(false);
  });
});
