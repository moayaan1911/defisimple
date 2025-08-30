// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleLend - SUSD Lending Pool
 * @dev Lending contract offering 8% APY on SUSD deposits
 * @notice Lend SUSD tokens to earn interest with instant withdrawals
 */
contract SimpleLend is Ownable, ReentrancyGuard {
    // Lending configuration
    IERC20 public immutable lendingToken; // SUSD token
    uint256 public constant APY = 8; // 8% Annual Percentage Yield
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant INTEREST_PRECISION = 1e18;

    // Pool state
    uint256 public totalLent;
    uint256 public totalInterestPaid;
    uint256 public interestPool; // Pool of SUSD for interest payments

    // Lending positions
    struct LendInfo {
        uint256 amount; // Amount of SUSD lent
        uint256 interestDebt; // Interest debt for accurate calculation
        uint256 lastLendTime; // When user last lent
        uint256 totalEarned; // Total interest earned historically
    }

    mapping(address => LendInfo) public lends;
    address[] public lenders; // Track all lenders for UI

    // Interest calculation variables
    uint256 public accInterestPerToken;
    uint256 public lastInterestUpdate;

    // Events for UI integration
    event Deposited(address indexed user, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed user, uint256 amount, uint256 interest, uint256 timestamp);
    event InterestClaimed(address indexed user, uint256 interest, uint256 timestamp);
    event InterestPoolFunded(uint256 amount);

    // Custom errors for gas efficiency
    error SimpleLend__ZeroAmount();
    error SimpleLend__InsufficientDeposit();
    error SimpleLend__InsufficientInterestPool();
    error SimpleLend__TransferFailed();
    error SimpleLend__NoInterestToClaim();

    constructor(address _lendingToken) Ownable(msg.sender) {
        lendingToken = IERC20(_lendingToken);
        lastInterestUpdate = block.timestamp;
    }

    /**
     * @dev Deposit SUSD tokens to earn 8% APY (UI Lend Tab function)
     * @param amount Amount of SUSD to deposit
     * @notice Users can deposit any amount with instant withdrawal
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert SimpleLend__ZeroAmount();

        _updateInterest();

        // If user is new lender, add to lenders array
        if (lends[msg.sender].amount == 0) {
            lenders.push(msg.sender);
        }

        // Calculate pending interest before updating position
        uint256 pendingInterest = _calculatePendingInterest(msg.sender);

        // Transfer tokens from user
        if (!lendingToken.transferFrom(msg.sender, address(this), amount)) {
            revert SimpleLend__TransferFailed();
        }

        // Update user's lending position
        lends[msg.sender].amount += amount;
        lends[msg.sender].interestDebt = (lends[msg.sender].amount * accInterestPerToken) / INTEREST_PRECISION;
        lends[msg.sender].lastLendTime = block.timestamp;

        // Add pending interest to user's earned total
        if (pendingInterest > 0) {
            lends[msg.sender].totalEarned += pendingInterest;
        }

        totalLent += amount;

        emit Deposited(msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Withdraw SUSD tokens and claim all interest
     * @param amount Amount of SUSD to withdraw (0 = withdraw all)
     * @notice Instant withdrawal with automatic interest claiming
     */
    function withdraw(uint256 amount) external nonReentrant {
        LendInfo storage userLend = lends[msg.sender];
        if (userLend.amount == 0) revert SimpleLend__InsufficientDeposit();

        // If amount is 0, withdraw everything
        if (amount == 0) {
            amount = userLend.amount;
        }

        if (amount > userLend.amount) revert SimpleLend__InsufficientDeposit();

        _updateInterest();

        // Calculate all pending interest
        uint256 pendingInterest = _calculatePendingInterest(msg.sender);
        uint256 totalInterest = pendingInterest + userLend.totalEarned;

        // Update user's lending position
        userLend.amount -= amount;
        userLend.interestDebt = (userLend.amount * accInterestPerToken) / INTEREST_PRECISION;
        userLend.totalEarned = 0; // Reset since we're paying out

        totalLent -= amount;

        // Transfer principal back to user
        if (!lendingToken.transfer(msg.sender, amount)) {
            revert SimpleLend__TransferFailed();
        }

        // Transfer interest if any
        if (totalInterest > 0) {
            if (interestPool < totalInterest) revert SimpleLend__InsufficientInterestPool();
            interestPool -= totalInterest;
            totalInterestPaid += totalInterest;

            if (!lendingToken.transfer(msg.sender, totalInterest)) {
                revert SimpleLend__TransferFailed();
            }
        }

        emit Withdrawn(msg.sender, amount, totalInterest, block.timestamp);
    }

    /**
     * @dev Claim interest without withdrawing principal
     * @notice Claim earned interest while keeping tokens deposited
     */
    function claimInterest() external nonReentrant {
        _updateInterest();

        uint256 pendingInterest = _calculatePendingInterest(msg.sender);
        uint256 totalInterest = pendingInterest + lends[msg.sender].totalEarned;

        if (totalInterest == 0) revert SimpleLend__NoInterestToClaim();
        if (interestPool < totalInterest) revert SimpleLend__InsufficientInterestPool();

        // Update user's interest debt and reset earned total
        lends[msg.sender].interestDebt = (lends[msg.sender].amount * accInterestPerToken) / INTEREST_PRECISION;
        lends[msg.sender].totalEarned = 0;

        // Transfer interest
        interestPool -= totalInterest;
        totalInterestPaid += totalInterest;

        if (!lendingToken.transfer(msg.sender, totalInterest)) {
            revert SimpleLend__TransferFailed();
        }

        emit InterestClaimed(msg.sender, totalInterest, block.timestamp);
    }

    /**
     * @dev Calculate user's current lending position (UI display function)
     * @param user Address to check
     * @return deposited Amount currently deposited
     * @return earned Current pending interest
     * @return apy Current APY (always 8%)
     * @return lendingTime Duration since last deposit
     */
    function getLendInfo(address user)
        external
        view
        returns (uint256 deposited, uint256 earned, uint256 apy, uint256 lendingTime)
    {
        LendInfo memory userLend = lends[user];
        deposited = userLend.amount;
        earned = _calculatePendingInterest(user) + userLend.totalEarned;
        apy = APY;
        lendingTime = block.timestamp - userLend.lastLendTime;
    }

    /**
     * @dev Calculate estimated interest for a given amount and time
     * @param amount Amount to calculate interest for
     * @param lendingDuration Duration in seconds
     * @return estimatedInterest Interest that would be earned
     */
    function calculateInterest(uint256 amount, uint256 lendingDuration)
        external
        pure
        returns (uint256 estimatedInterest)
    {
        if (amount == 0 || lendingDuration == 0) return 0;

        // Formula: amount * APY * duration / SECONDS_PER_YEAR / 100
        estimatedInterest = (amount * APY * lendingDuration) / (SECONDS_PER_YEAR * 100);
    }

    /**
     * @dev Get pool statistics (UI analytics)
     * @return totalLentAmount Total SUSD lent to pool
     * @return totalLenders Number of unique lenders
     * @return poolApy Pool APY (8%)
     * @return availableInterest Interest available for distribution
     * @return utilizationRate Pool utilization percentage
     */
    function getPoolStats()
        external
        view
        returns (
            uint256 totalLentAmount,
            uint256 totalLenders,
            uint256 poolApy,
            uint256 availableInterest,
            uint256 utilizationRate
        )
    {
        totalLentAmount = totalLent;
        totalLenders = _countActiveLenders();
        poolApy = APY;
        availableInterest = interestPool;

        // Calculate utilization rate (how much of the pool is being used)
        uint256 totalPoolSize = totalLent + interestPool;
        utilizationRate = totalPoolSize > 0 ? (totalLent * 100) / totalPoolSize : 0;
    }

    /**
     * @dev Get all active lenders (UI display - paginated)
     * @param offset Starting index
     * @param limit Number of lenders to return
     * @return lendersList Array of lender addresses
     * @return amounts Array of deposited amounts
     * @return interests Array of pending interests
     */
    function getLenders(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory lendersList, uint256[] memory amounts, uint256[] memory interests)
    {
        uint256 activeLenders = _countActiveLenders();
        if (offset >= activeLenders) {
            return (new address[](0), new uint256[](0), new uint256[](0));
        }

        uint256 returnCount = limit;
        if (offset + limit > activeLenders) {
            returnCount = activeLenders - offset;
        }

        lendersList = new address[](returnCount);
        amounts = new uint256[](returnCount);
        interests = new uint256[](returnCount);

        uint256 currentIndex = 0;
        uint256 returnIndex = 0;

        for (uint256 i = 0; i < lenders.length && returnIndex < returnCount; i++) {
            if (lends[lenders[i]].amount > 0) {
                if (currentIndex >= offset) {
                    lendersList[returnIndex] = lenders[i];
                    amounts[returnIndex] = lends[lenders[i]].amount;
                    interests[returnIndex] = _calculatePendingInterest(lenders[i]) + lends[lenders[i]].totalEarned;
                    returnIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @dev Get user's lending history summary
     * @param user Address to check
     * @return totalDeposited Total amount ever deposited
     * @return totalWithdrawn Total amount ever withdrawn
     * @return totalInterestEarned Total interest earned historically
     * @return currentPosition Current deposit amount
     */
    function getLendingHistory(address user)
        external
        view
        returns (uint256 totalDeposited, uint256 totalWithdrawn, uint256 totalInterestEarned, uint256 currentPosition)
    {
        // Note: This is a simplified version - in production you'd want to track more detailed history
        LendInfo memory userLend = lends[user];
        currentPosition = userLend.amount;
        totalInterestEarned = userLend.totalEarned + _calculatePendingInterest(user);

        // These would require additional tracking in a production system
        totalDeposited = currentPosition; // Simplified - doesn't account for previous deposits/withdrawals
        totalWithdrawn = 0; // Would need additional storage to track this
    }

    /**
     * @dev Fund the interest pool (owner only)
     * @param amount Amount of SUSD to add to interest pool
     */
    function fundInterestPool(uint256 amount) external onlyOwner {
        if (!lendingToken.transferFrom(msg.sender, address(this), amount)) {
            revert SimpleLend__TransferFailed();
        }

        interestPool += amount;
        emit InterestPoolFunded(amount);
    }

    /**
     * @dev Emergency withdraw for owner (only if no active lenders)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(totalLent == 0, "Cannot withdraw while users are lending");

        if (!lendingToken.transfer(owner(), amount)) {
            revert SimpleLend__TransferFailed();
        }
    }

    /**
     * @dev Update global interest variables
     */
    function _updateInterest() internal {
        if (totalLent == 0) {
            lastInterestUpdate = block.timestamp;
            return;
        }

        uint256 timeDiff = block.timestamp - lastInterestUpdate;
        if (timeDiff == 0) return;

        // Calculate interest per token
        uint256 interestPerToken = (timeDiff * APY * INTEREST_PRECISION) / (SECONDS_PER_YEAR * 100);
        accInterestPerToken += interestPerToken;
        lastInterestUpdate = block.timestamp;
    }

    /**
     * @dev Calculate pending interest for a user
     * @param user Address to calculate for
     * @return Pending interest amount
     */
    function _calculatePendingInterest(address user) internal view returns (uint256) {
        LendInfo memory userLend = lends[user];
        if (userLend.amount == 0) return 0;

        uint256 currentAccInterestPerToken = accInterestPerToken;

        // Add time since last update
        if (totalLent > 0) {
            uint256 timeDiff = block.timestamp - lastInterestUpdate;
            uint256 interestPerToken = (timeDiff * APY * INTEREST_PRECISION) / (SECONDS_PER_YEAR * 100);
            currentAccInterestPerToken += interestPerToken;
        }

        return (userLend.amount * currentAccInterestPerToken) / INTEREST_PRECISION - userLend.interestDebt;
    }

    /**
     * @dev Count active lenders (with non-zero deposits)
     */
    function _countActiveLenders() internal view returns (uint256 count) {
        for (uint256 i = 0; i < lenders.length; i++) {
            if (lends[lenders[i]].amount > 0) {
                count++;
            }
        }
    }
}
