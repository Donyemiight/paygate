// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SpendingPolicy.sol";

/**
 * @title PayGateRegistry
 * @notice The core PayGate contract. Binds an agent's identity (ERC-8004 agentId) to:
 *           - a payout wallet (the agent's own EOA / smart account)
 *           - a SpendingPolicy (caps, allowlist, kill switch)
 *           - the human owner (who can pause / mutate policy)
 *
 *         For the v1 submission, we do not deploy a new ERC-8004 registry — we point at
 *         the existing Base mainnet deployment and read/wrap its agentId. This keeps
 *         PayGate compatible with the 17,600+ agents already registered.
 *
 *         References:
 *           - ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004
 *           - Base Identity Registry: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 *           - Base Reputation Registry: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 */
contract PayGateRegistry is Ownable(msg.sender), ReentrancyGuard {
    // ------------------------------------------------------------------
    // Structs
    // ------------------------------------------------------------------

    struct AgentBinding {
        // ERC-8004 agentId (0 = not bound to an on-chain identity)
        uint256 erc8004AgentId;
        // agent's payout wallet (the address that actually holds USDC)
        address agentWallet;
        // spending policy contract (deployed per-agent)
        address policy;
        // human controller (owner of the policy + can rotate wallet)
        address humanOwner;
        // metadata
        string metadataURI; // ipfs:// or https://
        // status
        bool active;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    // agentId (PayGate's local counter) => binding
    mapping(uint256 => AgentBinding) public bindings;
    uint256 public nextAgentId;

    // owner-address => agentId (so an owner can find their agent)
    mapping(address => uint256) public ownerToAgent;

    // canonical ERC-8004 registry on Base (read-only reference; not modified by this contract)
    address public constant ERC8004_IDENTITY_BASE = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432;
    address public constant ERC8004_REPUTATION_BASE = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event AgentRegistered(uint256 indexed agentId, address indexed humanOwner, address agentWallet, address policy);
    event WalletRotated(uint256 indexed agentId, address oldWallet, address newWallet);
    event AgentDeactivated(uint256 indexed agentId, address indexed by);
    event AgentReactivated(uint256 indexed agentId, address indexed by);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error AgentNotFound();
    error NotAgentOwner();
    error AlreadyRegistered();
    error InvalidWallet();

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------

    modifier onlyAgentOwner(uint256 agentId) {
        AgentBinding storage b = bindings[agentId];
        if (b.humanOwner == address(0)) revert AgentNotFound();
        if (msg.sender != b.humanOwner) revert NotAgentOwner();
        _;
    }

    // ------------------------------------------------------------------
    // Register
    // ------------------------------------------------------------------

    /**
     * @notice Register a new agent. Mints a local PayGate agentId, deploys a SpendingPolicy,
     *         and (optionally) links an existing ERC-8004 agentId.
     *
     * @param agentWallet  the payout address the agent controls (receives x402 USDC)
     * @param perCallLimit max USDC (6 decimals) per single x402 payment
     * @param perEpochLimit max USDC per epoch (set 0 for unlimited)
     * @param epochDuration epoch length in seconds (0 disables epoch tracking)
     * @param erc8004AgentId existing ERC-8004 agentId (0 if not yet registered upstream)
     * @param metadataURI  optional metadata pointer (e.g. ipfs:// registration file)
     */
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

        SpendingPolicy policy = new SpendingPolicy(
            msg.sender,        // owner of the policy = human controller
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
            active: true
        });

        ownerToAgent[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, agentWallet, policyAddr);
    }

    // ------------------------------------------------------------------
    // Owner: mutate
    // ------------------------------------------------------------------

    function rotateWallet(uint256 agentId, address newWallet) external onlyAgentOwner(agentId) {
        if (newWallet == address(0)) revert InvalidWallet();
        AgentBinding storage b = bindings[agentId];
        address old = b.agentWallet;
        b.agentWallet = newWallet;
        emit WalletRotated(agentId, old, newWallet);
    }

    function setMetadataURI(uint256 agentId, string calldata uri) external onlyAgentOwner(agentId) {
        bindings[agentId].metadataURI = uri;
    }

    function deactivate(uint256 agentId) external onlyAgentOwner(agentId) {
        bindings[agentId].active = false;
        SpendingPolicy(bindings[agentId].policy).setPaused(true);
        emit AgentDeactivated(agentId, msg.sender);
    }

    function reactivate(uint256 agentId) external onlyAgentOwner(agentId) {
        bindings[agentId].active = true;
        SpendingPolicy(bindings[agentId].policy).setPaused(false);
        emit AgentReactivated(agentId, msg.sender);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getBinding(uint256 agentId)
        external
        view
        returns (
            uint256 erc8004AgentId,
            address agentWallet,
            address policy,
            address humanOwner,
            string memory metadataURI,
            bool active
        )
    {
        AgentBinding storage b = bindings[agentId];
        return (b.erc8004AgentId, b.agentWallet, b.policy, b.humanOwner, b.metadataURI, b.active);
    }

    function getAgentIdByOwner(address ownerAddr) external view returns (uint256) {
        return ownerToAgent[ownerAddr];
    }
}
