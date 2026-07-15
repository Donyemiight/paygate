// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PayGateRegistry.sol";
import "../src/SpendingPolicy.sol";

/**
 * @title PayGate contract tests
 * @notice Minimal smoke tests. Run with: forge test
 */
contract PayGateTest is Test {
    PayGateRegistry registry;
    address humanOwner = address(0xA11CE);
    address agentWallet = address(0xB0B);

    function setUp() public {
        registry = new PayGateRegistry();
    }

    function test_register_creates_binding_and_policy() public {
        vm.prank(humanOwner);
        (uint256 agentId, address policyAddr) = registry.register(
            agentWallet,
            100_000,        // $0.10 per call cap (6 decimals)
            1_000_000,      // $1.00 per epoch
            86400,          // 24h epoch
            0,              // no upstream ERC-8004 id
            "ipfs://test"
        );
        assertEq(agentId, 1);
        assertTrue(policyAddr != address(0));

        (
            uint256 erc8004,
            address wallet,
            address policy,
            address owner,
            string memory uri,
            bool active
        ) = registry.getBinding(agentId);
        assertEq(erc8004, 0);
        assertEq(wallet, agentWallet);
        assertEq(policy, policyAddr);
        assertEq(owner, humanOwner);
        assertEq(uri, "ipfs://test");
        assertTrue(active);
        assertEq(registry.getAgentIdByOwner(humanOwner), agentId);
    }

    function test_register_rejects_double_registration() public {
        vm.prank(humanOwner);
        registry.register(agentWallet, 100, 1000, 60, 0, "");
        vm.prank(humanOwner);
        vm.expectRevert(PayGateRegistry.AlreadyRegistered.selector);
        registry.register(agentWallet, 100, 1000, 60, 0, "");
    }

    function test_register_rejects_zero_wallet() public {
        vm.prank(humanOwner);
        vm.expectRevert(PayGateRegistry.InvalidWallet.selector);
        registry.register(address(0), 100, 1000, 60, 0, "");
    }

    function test_spendingPolicy_canSpend_blocks_when_paused() public {
        vm.prank(humanOwner);
        (, address policyAddr) = registry.register(agentWallet, 100, 1000, 60, 0, "");
        SpendingPolicy policy = SpendingPolicy(policyAddr);

        assertTrue(policy.canSpend(50, address(0)));

        vm.prank(humanOwner);
        policy.setPaused(true);
        assertFalse(policy.canSpend(50, address(0)));
    }

    function test_spendingPolicy_canSpend_blocks_over_per_call() public {
        vm.prank(humanOwner);
        (, address policyAddr) = registry.register(agentWallet, 100, 1000, 60, 0, "");
        SpendingPolicy policy = SpendingPolicy(policyAddr);
        assertFalse(policy.canSpend(101, address(0)));
        assertTrue(policy.canSpend(100, address(0)));
    }

    function test_spendingPolicy_canSpend_blocks_over_per_epoch() public {
        vm.prank(humanOwner);
        (, address policyAddr) = registry.register(agentWallet, 100, 1000, 60, 0, "");
        SpendingPolicy policy = SpendingPolicy(policyAddr);

        policy.recordSpend(800, address(0));
        assertTrue(policy.canSpend(200, address(0)));   // 800+200=1000 == cap, allowed
        assertFalse(policy.canSpend(201, address(0)));  // 800+201=1001 > cap
    }

    function test_spendingPolicy_allowlist_strict() public {
        vm.prank(humanOwner);
        (, address policyAddr) = registry.register(agentWallet, 0, 0, 0, 0, "");
        SpendingPolicy policy = SpendingPolicy(policyAddr);

        // No allowlist entries yet — open
        assertTrue(policy.canSpend(1, address(0xCAFE)));

        // Add one allowlist entry
        vm.prank(humanOwner);
        policy.setAllowlist(address(0xCAFE), true);
        // Now only that one is allowed
        assertTrue(policy.canSpend(1, address(0xCAFE)));
        assertFalse(policy.canSpend(1, address(0xBEEF)));
    }

    function test_deactivate_pauses_policy() public {
        vm.prank(humanOwner);
        (uint256 agentId, ) = registry.register(agentWallet, 100, 1000, 60, 0, "");
        vm.prank(humanOwner);
        registry.deactivate(agentId);
        (, , address policyAddr, , , bool active) = registry.getBinding(agentId);
        assertFalse(active);
        (, , , , bool paused) = SpendingPolicy(policyAddr).getPolicy();
        assertTrue(paused);
    }
}
