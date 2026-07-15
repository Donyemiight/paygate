// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SpendingPolicyV2.sol";

/**
 * @title PayGateRegistryV2
 * @notice v0.2 — adds two-step rotateWallet (proposeWallet + acceptWallet).
 * @dev v1 had a single rotateWallet() call that was front-runnable. v0.2
 *      uses a propose → accept flow with a 24h timelock, which is the same
 *      pattern as ERC-20 name updates and is well-understood by wallets.
 */
contract PayGateRegistryV2 is Ownable(msg.sender), ReentrancyGuard {
    struct WalletProposal {
        address proposed;
        uint64 proposedAt;
        bool active;
    }

    struct AgentBinding {
        uint256 erc8004AgentId;
        address agentWallet;
        address policy;
        address humanOwner;
        string metadataURI;
        bool active;
        WalletProposal walletProposal;
    }

    mapping(uint256 => AgentBinding) public bindings;
    mapping(address => uint256) public ownerToAgent;
    uint256 public nextAgentId;

    uint64 public constant WALLET_CHANGE_TIMELOCK = 24 hours;

    address public constant ERC8004_IDENTITY_BASE = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address public constant ERC8004_REPUTATION_BASE = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;

    event AgentRegistered(uint256 indexed agentId, address indexed humanOwner, address agentWallet, address policy);
    event WalletRotationProposed(uint256 indexed agentId, address indexed currentWallet, address indexed proposedWallet, uint64 executeAfter);
    event WalletRotationCancelled(uint256 indexed agentId);
    event WalletRotated(uint256 indexed agentId, address indexed oldWallet, address indexed newWallet);
    event AgentDeactivated(uint256 indexed agentId, address indexed by);
    event AgentReactivated(uint256 indexed agentId, address indexed by);

    error AgentNotFound();
    error NotAgentOwner();
    error AlreadyRegistered();
    error InvalidWallet();
    error NoPendingProposal();
    error ProposalNotReady();
    error ProposalExpired();
    error SameWallet();

    modifier onlyAgentOwner(uint256 agentId) {
        AgentBinding storage b = bindings[agentId];
        if (b.humanOwner == address(0)) revert AgentNotFound();
        if (msg.sender != b.humanOwner) revert NotAgentOwner();
        _;
    }

    function register(
        address agentWallet,
        uint128 perCallLimit,
        uint128 perEpochLimit,
        uint64 epochDuration,
        uint256 erc8004AgentId,
        string calldata metadataURI
    ) external returns (uint256 agentId, address policyAddr) {
        if (agentWallet == address(0)) revert InvalidWallet();
        if (ownerToAgent[msg.sender] != 0) revert AlreadyRegistered();

        agentId = ++nextAgentId;

        SpendingPolicyV2 policy = new SpendingPolicyV2(
            address(this),
            perCallLimit,
            perEpochLimit,
            epochDuration
        );
        policyAddr = address(policy);

        bindings[agentId] = AgentBinding({
            erc8004AgentId: erc8004AgentId,
            agentWallet: agentWallet,
            policy: policyAddr,
            humanOwner: msg.sender,
            metadataURI: metadataURI,
            active: true,
            walletProposal: WalletProposal({ proposed: address(0), proposedAt: 0, active: false })
        });

        ownerToAgent[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, agentWallet, policyAddr);
    }

    // ----- Two-step rotateWallet (v0.2) -----

    function proposeWallet(uint256 agentId, address newWallet) external onlyAgentOwner(agentId) {
        if (newWallet == address(0)) revert InvalidWallet();
        AgentBinding storage b = bindings[agentId];
        if (newWallet == b.agentWallet) revert SameWallet();
        b.walletProposal = WalletProposal({
            proposed: newWallet,
            proposedAt: uint64(block.timestamp),
            active: true
        });
        emit WalletRotationProposed(agentId, b.agentWallet, newWallet, uint64(block.timestamp) + WALLET_CHANGE_TIMELOCK);
    }

    function cancelWalletProposal(uint256 agentId) external onlyAgentOwner(agentId) {
        AgentBinding storage b = bindings[agentId];
        if (!b.walletProposal.active) revert NoPendingProposal();
        b.walletProposal = WalletProposal({ proposed: address(0), proposedAt: 0, active: false });
        emit WalletRotationCancelled(agentId);
    }

    function acceptWallet(uint256 agentId) external onlyAgentOwner(agentId) {
        AgentBinding storage b = bindings[agentId];
        if (!b.walletProposal.active) revert NoPendingProposal();
        if (uint64(block.timestamp) < b.walletProposal.proposedAt + WALLET_CHANGE_TIMELOCK) {
            revert ProposalNotReady();
        }
        if (uint64(block.timestamp) > b.walletProposal.proposedAt + WALLET_CHANGE_TIMELOCK * 7) {
            // expire after 7 days
            revert ProposalExpired();
        }
        address old = b.agentWallet;
        b.agentWallet = b.walletProposal.proposed;
        b.walletProposal = WalletProposal({ proposed: address(0), proposedAt: 0, active: false });
        emit WalletRotated(agentId, old, b.agentWallet);
    }

    // ----- v1 (kept for back-compat) -----

    function setMetadataURI(uint256 agentId, string calldata uri) external onlyAgentOwner(agentId) {
        bindings[agentId].metadataURI = uri;
    }

    function deactivate(uint256 agentId) external onlyAgentOwner(agentId) {
        bindings[agentId].active = false;
        SpendingPolicyV2(bindings[agentId].policy).setPaused(true);
        emit AgentDeactivated(agentId, msg.sender);
    }

    function reactivate(uint256 agentId) external onlyAgentOwner(agentId) {
        bindings[agentId].active = true;
        SpendingPolicyV2(bindings[agentId].policy).setPaused(false);
        emit AgentReactivated(agentId, msg.sender);
    }

    function setLimits(uint256 agentId, uint128 perCallLimit, uint128 perEpochLimit) external onlyAgentOwner(agentId) {
        SpendingPolicyV2(bindings[agentId].policy).setLimits(perCallLimit, perEpochLimit);
    }

    function setAllowlist(uint256 agentId, address counterparty, bool allowed) external onlyAgentOwner(agentId) {
        SpendingPolicyV2(bindings[agentId].policy).setAllowlist(counterparty, allowed);
    }

    function getBinding(uint256 agentId)
        external
        view
        returns (uint256 erc8004AgentId, address agentWallet, address policy, address humanOwner, string memory metadataURI, bool active)
    {
        AgentBinding storage b = bindings[agentId];
        return (b.erc8004AgentId, b.agentWallet, b.policy, b.humanOwner, b.metadataURI, b.active);
    }

    function getPendingProposal(uint256 agentId) external view returns (address proposed, uint64 proposedAt, bool active) {
        AgentBinding storage b = bindings[agentId];
        return (b.walletProposal.proposed, b.walletProposal.proposedAt, b.walletProposal.active);
    }

    function getAgentIdByOwner(address ownerAddr) external view returns (uint256) {
        return ownerToAgent[ownerAddr];
    }
}
