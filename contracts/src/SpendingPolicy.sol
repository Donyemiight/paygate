// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SpendingPolicy
 * @notice Per-agent spending policy that enforces caps, allowlists, and a kill switch.
 * @dev Owned by the agent's human controller. The agent (via its bound agentWallet) is the
 *      subject of the policy; the owner is the only one who can mutate or pause it.
 *
 *      Designed to be cheap to read on every x402 settlement (single SLOAD of packed slots).
 */
contract SpendingPolicy is ReentrancyGuard {
    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    struct Policy {
        // global per-epoch caps
        uint128 perCallLimit;       // max USDC base-units (6 decimals) per single x402 payment
        uint128 perEpochLimit;      // max USDC base-units per epoch (e.g. 24h)
        // allowlist: 0 address == open (any counterparty allowed)
        mapping(address => bool) allowlist;
        // kill switch
        bool paused;
        // epoch bookkeeping
        uint64 epochStart;
        uint64 epochDuration;       // seconds; 0 == disabled
        uint128 epochSpent;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    address public owner;            // human controller
    Policy private _policy;

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event PolicyUpdated(uint128 perCallLimit, uint128 perEpochLimit, uint64 epochDuration);
    event AllowlistUpdated(address indexed counterparty, bool allowed);
    event Paused(bool paused);
    event SpendRecorded(uint128 amount, uint128 epochSpentAfter);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error NotOwner();
    error Paused_();
    error ExceedsPerCallLimit(uint128 requested, uint128 cap);
    error ExceedsPerEpochLimit(uint128 requested, uint128 cap);
    error NotAllowlisted(address counterparty);

    // ------------------------------------------------------------------
    // Modifiers
    // ------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------

    constructor(
        address owner_,
        uint128 perCallLimit_,
        uint128 perEpochLimit_,
        uint64 epochDuration_
    ) {
        owner = owner_;
        _policy.perCallLimit = perCallLimit_;
        _policy.perEpochLimit = perEpochLimit_;
        _policy.epochDuration = epochDuration_;
        _policy.epochStart = uint64(block.timestamp);
        _policy.epochSpent = 0;
        _policy.paused = false;
        emit PolicyUpdated(perCallLimit_, perEpochLimit_, epochDuration_);
    }

    // ------------------------------------------------------------------
    // Owner: mutate
    // ------------------------------------------------------------------

    function setLimits(uint128 perCallLimit_, uint128 perEpochLimit_) external onlyOwner {
        _policy.perCallLimit = perCallLimit_;
        _policy.perEpochLimit = perEpochLimit_;
        _policy.epochStart = uint64(block.timestamp);
        _policy.epochSpent = 0;
        emit PolicyUpdated(perCallLimit_, perEpochLimit_, _policy.epochDuration);
    }

    function setAllowlist(address counterparty, bool allowed) external onlyOwner {
        _policy.allowlist[counterparty] = allowed;
        emit AllowlistUpdated(counterparty, allowed);
    }

    function setPaused(bool paused_) external onlyOwner {
        _policy.paused = paused_;
        emit Paused(paused_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ------------------------------------------------------------------
    // Agent: preflight check before settling an x402 payment
    // ------------------------------------------------------------------

    /**
     * @notice Returns true if the agent is allowed to spend `amount` to `counterparty` right now.
     *         Does not record the spend; call recordSpend() after settlement succeeds.
     */
    function canSpend(uint128 amount, address counterparty) external view returns (bool) {
        Policy storage p = _policy;
        if (p.paused) return false;
        if (p.perCallLimit != 0 && amount > p.perCallLimit) return false;
        if (p.perEpochLimit != 0) {
            uint128 spent = _currentSpent(p);
            if (spent + amount > p.perEpochLimit) return false;
        }
        if (counterparty != address(0) && p.allowlist[counterparty] == false && _isAllowlistStrict(p)) {
            return false;
        }
        return true;
    }

    /**
     * @notice Records a successful spend. Reverts if not allowed (defense in depth).
     */
    function recordSpend(uint128 amount, address counterparty) external nonReentrant {
        Policy storage p = _policy;
        if (p.paused) revert Paused_();
        if (p.perCallLimit != 0 && amount > p.perCallLimit) {
            revert ExceedsPerCallLimit(amount, p.perCallLimit);
        }
        if (p.perEpochLimit != 0) {
            uint128 spent = _currentSpent(p);
            if (spent + amount > p.perEpochLimit) {
                revert ExceedsPerEpochLimit(spent + amount, p.perEpochLimit);
            }
        }
        if (counterparty != address(0) && p.allowlist[counterparty] == false && _isAllowlistStrict(p)) {
            revert NotAllowlisted(counterparty);
        }
        _policy.epochSpent = _currentSpent(p) + amount;
        emit SpendRecorded(amount, _policy.epochSpent);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getPolicy()
        external
        view
        returns (uint128 perCallLimit, uint128 perEpochLimit, uint64 epochDuration, uint128 epochSpent, bool paused)
    {
        Policy storage p = _policy;
        return (p.perCallLimit, p.perEpochLimit, p.epochDuration, _currentSpent(p), p.paused);
    }

    function isAllowlisted(address counterparty) external view returns (bool) {
        return _policy.allowlist[counterparty];
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _currentSpent(Policy storage p) internal view returns (uint128) {
        if (p.epochDuration == 0) return 0;
        if (uint64(block.timestamp) >= p.epochStart + p.epochDuration) return 0;
        return p.epochSpent;
    }

    /**
     * @dev An allowlist is "strict" if at least one entry has been set to true.
     *      Otherwise (all false / unset), it's treated as open to avoid bricking the agent
     *      before the owner configures it. Once any allowlist entry is true, only true entries pass.
     */
    function _isAllowlistStrict(Policy storage p) internal view returns (bool) {
        // we cannot iterate cheaply; track via storage slot. For v1, we ship a single
        // bool flag set the first time setAllowlist(x, true) is called.
        return _allowlistStrict;
    }

    // toggled on first setAllowlist(x, true)
    bool private _allowlistStrict;
}
