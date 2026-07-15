// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SpendingPolicyV2
 * @notice v0.2 — adds EpochReset event + on-chain config versioning.
 * @dev v1 had a silent epoch reset on setLimits(). v0.2 emits an event so the
 *      human owner (and any off-chain indexer) can see when an epoch boundary
 *      is crossed by a limits change.
 */
contract SpendingPolicyV2 is ReentrancyGuard {
    struct Policy {
        uint128 perCallLimit;
        uint128 perEpochLimit;
        mapping(address => bool) allowlist;
        bool paused;
        uint64 epochStart;
        uint64 epochDuration;
        uint128 epochSpent;
        uint64 version; // bumped on every config change for off-chain indexers
    }

    address public owner;
    Policy private _policy;

    event PolicyUpdated(uint128 perCallLimit, uint128 perEpochLimit, uint64 epochDuration, uint64 version);
    event AllowlistUpdated(address indexed counterparty, bool allowed, uint64 version);
    event PausedUpdated(bool paused, uint64 version);
    event EpochReset(uint64 oldEpochStart, uint64 newEpochStart, uint64 version);
    event SpendRecorded(uint128 amount, uint128 epochSpentAfter, uint64 version);

    error NotOwner();
    error Paused_();
    error ExceedsPerCallLimit(uint128 requested, uint128 cap);
    error ExceedsPerEpochLimit(uint128 requested, uint128 cap);
    error NotAllowlisted(address counterparty);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

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
        _policy.version = 1;
        emit PolicyUpdated(perCallLimit_, perEpochLimit_, epochDuration_, 1);
    }

    function setLimits(uint128 perCallLimit_, uint128 perEpochLimit_) external onlyOwner {
        _policy.perCallLimit = perCallLimit_;
        _policy.perEpochLimit = perEpochLimit_;
        uint64 oldStart = _policy.epochStart;
        _policy.epochStart = uint64(block.timestamp);
        _policy.epochSpent = 0;
        unchecked { _policy.version++; }
        emit PolicyUpdated(perCallLimit_, perEpochLimit_, _policy.epochDuration, _policy.version);
        emit EpochReset(oldStart, _policy.epochStart, _policy.version);
    }

    function setAllowlist(address counterparty, bool allowed) external onlyOwner {
        _policy.allowlist[counterparty] = allowed;
        if (allowed) _allowlistStrict = true;
        unchecked { _policy.version++; }
        emit AllowlistUpdated(counterparty, allowed, _policy.version);
    }

    function setPaused(bool paused_) external onlyOwner {
        _policy.paused = paused_;
        unchecked { _policy.version++; }
        emit PausedUpdated(paused_, _policy.version);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function canSpend(uint128 amount, address counterparty) external view returns (bool) {
        Policy storage p = _policy;
        if (p.paused) return false;
        if (p.perCallLimit != 0 && amount > p.perCallLimit) return false;
        if (p.perEpochLimit != 0) {
            uint128 spent = _currentSpent(p);
            if (spent + amount > p.perEpochLimit) return false;
        }
        if (counterparty != address(0) && p.allowlist[counterparty] == false && _allowlistStrict) {
            return false;
        }
        return true;
    }

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
        if (counterparty != address(0) && p.allowlist[counterparty] == false && _allowlistStrict) {
            revert NotAllowlisted(counterparty);
        }
        _policy.epochSpent = _currentSpent(p) + amount;
        emit SpendRecorded(amount, _policy.epochSpent, p.version);
    }

    function getPolicy()
        external
        view
        returns (uint128 perCallLimit, uint128 perEpochLimit, uint64 epochDuration, uint128 epochSpent, bool paused, uint64 version)
    {
        Policy storage p = _policy;
        return (p.perCallLimit, p.perEpochLimit, p.epochDuration, _currentSpent(p), p.paused, p.version);
    }

    function isAllowlisted(address counterparty) external view returns (bool) {
        return _policy.allowlist[counterparty];
    }

    function _currentSpent(Policy storage p) internal view returns (uint128) {
        if (p.epochDuration == 0) return 0;
        if (uint64(block.timestamp) >= p.epochStart + p.epochDuration) return 0;
        return p.epochSpent;
    }

    bool private _allowlistStrict;
}
