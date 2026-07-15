// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PayGateRegistry.sol";
import "../src/SpendingPolicy.sol";

/**
 * @title PayGate Foundry tests
 * @notice Run with:  forge test -vvv
 *
 * Setup once:
 *   forge install foundry-rs/forge-std --no-commit
 *   forge install OpenZeppelin/openzeppelin-contracts --no-commit
 */
contract PayGateTest is Test {
    PayGateRegistry registry;
    address alice = address(0xA11CE);
    address bob   = address(0xB0B);
    address carol = address(0xCAFE);

    function setUp() public {
        registry = new PayGateRegistry();
    }

    // ---------- Registry ----------

    function test_register_creates_binding_and_deploys_policy() public {
        vm.prank(alice);
        (uint256 agentId, address policyAddr) = registry.register(
            bob, 100_000, 1_000_000, 86400, 0, "ipfs://test"
        );
        assertEq(agentId, 1);
        assertTrue(policyAddr != address(0));

        (uint256 e8004, address wallet, address policy, address owner, string memory uri, bool active) =
            registry.getBinding(1);
        assertEq(e8004, 0);
        assertEq(wallet, bob);
        assertEq(policy, policyAddr);
        assertEq(owner, alice);
        assertEq(uri, "ipfs://test");
        assertTrue(active);
        assertEq(registry.getAgentIdByOwner(alice), 1);
    }

    function test_register_rejects_double_registration() public {
        vm.prank(alice);
        registry.register(bob, 100, 1000, 60, 0, "");
        vm.prank(alice);
        vm.expectRevert(PayGateRegistry.AlreadyRegistered.selector);
        registry.register(bob, 100, 1000, 60, 0, "");
    }

    function test_register_rejects_zero_wallet() public {
        vm.prank(alice);
        vm.expectRevert(PayGateRegistry.InvalidWallet.selector);
        registry.register(address(0), 100, 1000, 60, 0, "");
    }

    function test_rotateWallet_only_owner() public {
        vm.prank(alice);
        registry.register(bob, 100, 1000, 60, 0, "");
        vm.prank(alice);
        registry.rotateWallet(1, carol);
        (, address wallet,, ,, ) = registry.getBinding(1);
        assertEq(wallet, carol);

        vm.prank(bob);
        vm.expectRevert(PayGateRegistry.NotAgentOwner.selector);
        registry.rotateWallet(1, bob);
    }

    function test_deactivate_pauses_policy_and_reactivate_restores() public {
        vm.prank(alice);
        registry.register(bob, 100, 1000, 60, 0, "");
        (, , address policy,, , bool active) = registry.getBinding(1);
        assertTrue(active);

        vm.prank(alice);
        registry.deactivate(1);
        (, , , , , active) = registry.getBinding(1);
        assertFalse(active);
        (, , , , bool paused) = SpendingPolicy(policy).getPolicy();
        assertTrue(paused);

        vm.prank(alice);
        registry.reactivate(1);
        (, , , , , active) = registry.getBinding(1);
        assertTrue(active);
        (, , , , bool paused) = SpendingPolicy(policy).getPolicy();
        assertFalse(paused);
    }

    function test_setLimits_via_registry() public {
        vm.prank(alice);
        (uint256 agentId, address policy) = registry.register(bob, 100_000, 1_000_000, 86400, 0, "");
        vm.prank(alice);
        registry.setLimits(agentId, 50_000, 500_000);
        (uint128 pc, uint128 pe,,, ) = SpendingPolicy(policy).getPolicy();
        assertEq(pc, 50_000);
        assertEq(pe, 500_000);
    }

    function test_setAllowlist_via_registry_and_strict_mode() public {
        vm.prank(alice);
        (, address policy) = registry.register(bob, 0, 0, 0, 0, "");

        // open allowlist by default — anyone passes
        assertTrue(SpendingPolicy(policy).canSpend(1, address(0xDEAD)));

        // set one entry to true → strict mode kicks in
        vm.prank(alice);
        registry.setAllowlist(1, address(0xCAFE), true);

        assertTrue(SpendingPolicy(policy).canSpend(1, address(0xCAFE)));
        assertFalse(SpendingPolicy(policy).canSpend(1, address(0xDEAD)));
    }

    // ---------- SpendingPolicy (unit) ----------

    function test_canSpend_blocks_over_per_call() public {
        vm.prank(alice);
        (, address policy) = registry.register(bob, 100, 1000, 60, 0, "");
        assertFalse(SpendingPolicy(policy).canSpend(101, address(0)));
        assertTrue(SpendingPolicy(policy).canSpend(100, address(0)));
    }

    function test_canSpend_blocks_when_paused() public {
        vm.prank(alice);
        (uint256 agentId, address policy) = registry.register(bob, 100, 1000, 60, 0, "");
        assertTrue(SpendingPolicy(policy).canSpend(50, address(0)));

        vm.prank(alice);
        registry.deactivate(agentId);
        assertFalse(SpendingPolicy(policy).canSpend(50, address(0)));
    }

    function test_recordSpend_reverts_over_per_call() public {
        vm.prank(alice);
        (, address policy) = registry.register(bob, 100, 1000, 60, 0, "");
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(SpendingPolicy.ExceedsPerCallLimit.selector, uint128(200), uint128(100))
        );
        SpendingPolicy(policy).recordSpend(200, address(0));
    }

    function test_recordSpend_reverts_when_paused() public {
        vm.prank(alice);
        (uint256 agentId, address policy) = registry.register(bob, 100, 1000, 60, 0, "");
        vm.prank(alice);
        registry.deactivate(agentId);
        vm.prank(alice);
        vm.expectRevert(SpendingPolicy.Paused_.selector);
        SpendingPolicy(policy).recordSpend(50, address(0));
    }

    function test_recordSpend_tracks_epoch_spend() public {
        // per-call 900, per-epoch 1000, 24h
        vm.prank(alice);
        (uint256 agentId, address policy) = registry.register(bob, 900_000, 1_000_000, 86400, 0, "");
        vm.prank(alice);
        registry.setLimits(agentId, 900_000, 1_000_000);  // idempotent

        vm.prank(alice);
        SpendingPolicy(policy).recordSpend(800_000, address(0));
        (, , , uint128 spent, ) = SpendingPolicy(policy).getPolicy();
        assertEq(spent, 800_000);

        // 200 left in epoch, 100 per-call
        assertTrue(SpendingPolicy(policy).canSpend(200_000, address(0)));
        assertFalse(SpendingPolicy(policy).canSpend(200_001, address(0)));
    }

    // ---------- Invariants ----------

    function test_invariant_only_owner_can_pause() public {
        // The policy is owned by the registry, so only the registry can pause.
        // Bob (the agent wallet) cannot pause directly.
        vm.prank(alice);
        (, address policy) = registry.register(bob, 100, 1000, 60, 0, "");

        vm.prank(bob);
        vm.expectRevert(SpendingPolicy.NotOwner.selector);
        SpendingPolicy(policy).setPaused(true);
    }

    function test_invariant_zero_address_cannot_be_owner() public {
        // The policy is always owned by the registry, never by address(0).
        vm.prank(alice);
        (, address policy) = registry.register(bob, 100, 1000, 60, 0, "");
        assertEq(SpendingPolicy(policy).owner(), address(registry));
    }
}
