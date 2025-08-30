// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleStake - SUSD Staking Pool
 * @dev Staking contract offering 12% APY on SUSD tokens
 * @notice Stake SUSD tokens to earn rewards with no lock-up period
 */
contract SimpleStake is Ownable, ReentrancyGuard {
    // Staking configuration
    IERC20 public immutable stakingToken; // SUSD token
    uint256 public constant APY = 12; // 12% Annual Percentage Yield
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant REWARD_PRECISION = 1e18;

    // Pool state
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public rewardPool; // Pool of SUSD for rewards

    // Staking positions
    struct StakeInfo {
        uint256 amount; // Amount of SUSD staked
        uint256 rewardDebt; // Reward debt for accurate calculation
        uint256 lastStakeTime; // When user last staked
        uint256 totalEarned; // Total rewards earned historically
    }

    mapping(address => StakeInfo) public stakes;
    address[] public stakers; // Track all stakers for UI

    // Reward calculation variables
    uint256 public accRewardPerToken;
    uint256 public lastRewardUpdate;

    // Events for UI integration
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 rewards, uint256 timestamp);
    event RewardsClaimed(address indexed user, uint256 rewards, uint256 timestamp);
    event RewardPoolFunded(uint256 amount);

    // Custom errors for gas efficiency
    error SimpleStake__ZeroAmount();
    error SimpleStake__InsufficientStake();
    error SimpleStake__InsufficientRewardPool();
    error SimpleStake__TransferFailed();
    error SimpleStake__NoRewardsToClaim();

    constructor(address _stakingToken) Ownable(msg.sender) {
        stakingToken = IERC20(_stakingToken);
        lastRewardUpdate = block.timestamp;
    }

    /**
     * @dev Stake SUSD tokens to earn 12% APY (UI Stake Tab function)
     * @param amount Amount of SUSD to stake
     * @notice Users can stake any amount with no lock-up period
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert SimpleStake__ZeroAmount();

        _updateRewards();

        // If user is new staker, add to stakers array
        if (stakes[msg.sender].amount == 0) {
            stakers.push(msg.sender);
        }

        // Calculate pending rewards before updating position
        uint256 pendingRewards = _calculatePendingRewards(msg.sender);

        // Transfer tokens from user
        if (!stakingToken.transferFrom(msg.sender, address(this), amount)) {
            revert SimpleStake__TransferFailed();
        }

        // Update user's stake
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * accRewardPerToken) / REWARD_PRECISION;
        stakes[msg.sender].lastStakeTime = block.timestamp;

        // Add pending rewards to user's earned total
        if (pendingRewards > 0) {
            stakes[msg.sender].totalEarned += pendingRewards;
        }

        totalStaked += amount;

        emit Staked(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Unstake SUSD tokens and claim all rewards
     * @param amount Amount of SUSD to unstake (0 = unstake all)
     * @notice Instant unstaking with automatic reward claiming
     */
    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        if (userStake.amount == 0) revert SimpleStake__InsufficientStake();

        // If amount is 0, unstake everything
        if (amount == 0) {
            amount = userStake.amount;
        }

        if (amount > userStake.amount) revert SimpleStake__InsufficientStake();

        _updateRewards();

        // Calculate all pending rewards
        uint256 pendingRewards = _calculatePendingRewards(msg.sender);
        uint256 totalRewards = pendingRewards + userStake.totalEarned;

        // Update user's stake
        userStake.amount -= amount;
        userStake.rewardDebt = (userStake.amount * accRewardPerToken) / REWARD_PRECISION;
        userStake.totalEarned = 0; // Reset since we're paying out

        totalStaked -= amount;

        // Transfer staked tokens back to user
        if (!stakingToken.transfer(msg.sender, amount)) {
            revert SimpleStake__TransferFailed();
        }

        // Transfer rewards if any
        if (totalRewards > 0) {
            if (rewardPool < totalRewards) revert SimpleStake__InsufficientRewardPool();
            rewardPool -= totalRewards;
            totalRewardsDistributed += totalRewards;

            if (!stakingToken.transfer(msg.sender, totalRewards)) {
                revert SimpleStake__TransferFailed();
            }
        }

        emit Unstaked(msg.sender, amount, totalRewards, block.timestamp);
    }

    /**
     * @dev Claim rewards without unstaking
     * @notice Claim earned rewards while keeping tokens staked
     */
    function claimRewards() external nonReentrant {
        _updateRewards();

        uint256 pendingRewards = _calculatePendingRewards(msg.sender);
        uint256 totalRewards = pendingRewards + stakes[msg.sender].totalEarned;

        if (totalRewards == 0) revert SimpleStake__NoRewardsToClaim();
        if (rewardPool < totalRewards) revert SimpleStake__InsufficientRewardPool();

        // Update user's reward debt and reset earned total
        stakes[msg.sender].rewardDebt = (stakes[msg.sender].amount * accRewardPerToken) / REWARD_PRECISION;
        stakes[msg.sender].totalEarned = 0;

        // Transfer rewards
        rewardPool -= totalRewards;
        totalRewardsDistributed += totalRewards;

        if (!stakingToken.transfer(msg.sender, totalRewards)) {
            revert SimpleStake__TransferFailed();
        }

        emit RewardsClaimed(msg.sender, totalRewards, block.timestamp);
    }

    /**
     * @dev Calculate user's current staking position (UI display function)
     * @param user Address to check
     * @return staked Amount currently staked
     * @return earned Current pending rewards
     * @return apy Current APY (always 12%)
     * @return stakingTime Duration since last stake
     */
    function getStakeInfo(address user)
        external
        view
        returns (uint256 staked, uint256 earned, uint256 apy, uint256 stakingTime)
    {
        StakeInfo memory userStake = stakes[user];
        staked = userStake.amount;
        earned = _calculatePendingRewards(user) + userStake.totalEarned;
        apy = APY;
        stakingTime = block.timestamp - userStake.lastStakeTime;
    }

    /**
     * @dev Calculate estimated rewards for a given amount and time
     * @param amount Amount to calculate rewards for
     * @param stakingDuration Duration in seconds
     * @return estimatedRewards Rewards that would be earned
     */
    function calculateRewards(uint256 amount, uint256 stakingDuration)
        external
        pure
        returns (uint256 estimatedRewards)
    {
        if (amount == 0 || stakingDuration == 0) return 0;

        // Formula: amount * APY * duration / SECONDS_PER_YEAR / 100
        estimatedRewards = (amount * APY * stakingDuration) / (SECONDS_PER_YEAR * 100);
    }

    /**
     * @dev Get pool statistics (UI analytics)
     * @return totalStakedAmount Total SUSD staked in pool
     * @return totalStakers Number of unique stakers
     * @return poolApy Pool APY (12%)
     * @return availableRewards Rewards available for distribution
     */
    function getPoolStats()
        external
        view
        returns (uint256 totalStakedAmount, uint256 totalStakers, uint256 poolApy, uint256 availableRewards)
    {
        totalStakedAmount = totalStaked;
        totalStakers = _countActiveStakers();
        poolApy = APY;
        availableRewards = rewardPool;
    }

    /**
     * @dev Get all active stakers (UI display - paginated)
     * @param offset Starting index
     * @param limit Number of stakers to return
     * @return stakersList Array of staker addresses
     * @return amounts Array of staked amounts
     * @return rewards Array of pending rewards
     */
    function getStakers(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory stakersList, uint256[] memory amounts, uint256[] memory rewards)
    {
        uint256 activeStakers = _countActiveStakers();
        if (offset >= activeStakers) {
            return (new address[](0), new uint256[](0), new uint256[](0));
        }

        uint256 returnCount = limit;
        if (offset + limit > activeStakers) {
            returnCount = activeStakers - offset;
        }

        stakersList = new address[](returnCount);
        amounts = new uint256[](returnCount);
        rewards = new uint256[](returnCount);

        uint256 currentIndex = 0;
        uint256 returnIndex = 0;

        for (uint256 i = 0; i < stakers.length && returnIndex < returnCount; i++) {
            if (stakes[stakers[i]].amount > 0) {
                if (currentIndex >= offset) {
                    stakersList[returnIndex] = stakers[i];
                    amounts[returnIndex] = stakes[stakers[i]].amount;
                    rewards[returnIndex] = _calculatePendingRewards(stakers[i]) + stakes[stakers[i]].totalEarned;
                    returnIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @dev Fund the reward pool (owner only)
     * @param amount Amount of SUSD to add to reward pool
     */
    function fundRewardPool(uint256 amount) external onlyOwner {
        if (!stakingToken.transferFrom(msg.sender, address(this), amount)) {
            revert SimpleStake__TransferFailed();
        }

        rewardPool += amount;
        emit RewardPoolFunded(amount);
    }

    /**
     * @dev Emergency withdraw for owner (only if no active stakers)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(totalStaked == 0, "Cannot withdraw while users are staking");

        if (!stakingToken.transfer(owner(), amount)) {
            revert SimpleStake__TransferFailed();
        }
    }

    /**
     * @dev Update global reward variables
     */
    function _updateRewards() internal {
        if (totalStaked == 0) {
            lastRewardUpdate = block.timestamp;
            return;
        }

        uint256 timeDiff = block.timestamp - lastRewardUpdate;
        if (timeDiff == 0) return;

        // Calculate rewards per token
        uint256 rewardPerToken = (timeDiff * APY * REWARD_PRECISION) / (SECONDS_PER_YEAR * 100);
        accRewardPerToken += rewardPerToken;
        lastRewardUpdate = block.timestamp;
    }

    /**
     * @dev Calculate pending rewards for a user
     * @param user Address to calculate for
     * @return Pending rewards amount
     */
    function _calculatePendingRewards(address user) internal view returns (uint256) {
        StakeInfo memory userStake = stakes[user];
        if (userStake.amount == 0) return 0;

        uint256 currentAccRewardPerToken = accRewardPerToken;

        // Add time since last update
        if (totalStaked > 0) {
            uint256 timeDiff = block.timestamp - lastRewardUpdate;
            uint256 rewardPerToken = (timeDiff * APY * REWARD_PRECISION) / (SECONDS_PER_YEAR * 100);
            currentAccRewardPerToken += rewardPerToken;
        }

        return (userStake.amount * currentAccRewardPerToken) / REWARD_PRECISION - userStake.rewardDebt;
    }

    /**
     * @dev Count active stakers (with non-zero stakes)
     */
    function _countActiveStakers() internal view returns (uint256 count) {
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakes[stakers[i]].amount > 0) {
                count++;
            }
        }
    }
}
