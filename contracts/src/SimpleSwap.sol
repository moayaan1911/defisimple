// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleSwap
 * @dev Custom swap contract for SUSD <-> MockETH at fixed rates
 * @notice NOT using external DEX - internal swap logic with transaction history
 */
contract SimpleSwap is Ownable, ReentrancyGuard {
    // Token contracts
    IERC20 public immutable susdToken;
    IERC20 public immutable mockETHToken;

    // Swap rate constants (1 SUSD = 0.00025 MockETH, ETH @ $4,000)
    uint256 public constant SUSD_TO_MOCKETH_RATE = 25; // 25 / 100000 = 0.00025
    uint256 public constant RATE_DENOMINATOR = 100000;
    uint256 public constant MOCKETH_TO_SUSD_RATE = 4000; // 1 MockETH = 4000 SUSD

    // Swap fee (0.3% like Uniswap)
    uint256 public constant SWAP_FEE_PERCENT = 30; // 0.3% = 30/10000
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Transaction history tracking
    struct SwapTransaction {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // Storage for transaction history
    SwapTransaction[] public swapHistory;
    mapping(address => uint256[]) public userSwapIndices;

    // Pool liquidity tracking
    uint256 public susdLiquidity;
    uint256 public mockETHLiquidity;

    // Events for UI integration
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );

    event LiquidityAdded(address indexed provider, uint256 susdAmount, uint256 mockETHAmount, uint256 timestamp);

    event SwapFailed(address indexed user, string reason);

    // Custom errors for gas efficiency
    error SimpleSwap__InvalidToken();
    error SimpleSwap__InsufficientAmount();
    error SimpleSwap__InsufficientLiquidity();
    error SimpleSwap__TransferFailed();
    error SimpleSwap__ZeroAddress();
    error SimpleSwap__SlippageExceeded();

    constructor(address _susdToken, address _mockETHToken) Ownable(msg.sender) {
        if (_susdToken == address(0) || _mockETHToken == address(0)) {
            revert SimpleSwap__ZeroAddress();
        }

        susdToken = IERC20(_susdToken);
        mockETHToken = IERC20(_mockETHToken);
    }

    /**
     * @dev Swap SUSD for MockETH (UI Swap Tab function)
     * @param susdAmount Amount of SUSD to swap
     * @param minMockETHOut Minimum MockETH expected (slippage protection)
     */
    function swapSUSDForMockETH(uint256 susdAmount, uint256 minMockETHOut) external nonReentrant {
        if (susdAmount == 0) revert SimpleSwap__InsufficientAmount();

        // Calculate MockETH output before fees
        uint256 mockETHOut = calculateMockETHOutput(susdAmount);

        // Calculate and deduct swap fee
        uint256 swapFee = (mockETHOut * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 mockETHAfterFee = mockETHOut - swapFee;

        // Slippage check
        if (mockETHAfterFee < minMockETHOut) {
            emit SwapFailed(msg.sender, "Slippage exceeded");
            revert SimpleSwap__SlippageExceeded();
        }

        // Liquidity check
        if (mockETHAfterFee > mockETHLiquidity) {
            emit SwapFailed(msg.sender, "Insufficient MockETH liquidity");
            revert SimpleSwap__InsufficientLiquidity();
        }

        // Execute token transfers
        if (!susdToken.transferFrom(msg.sender, address(this), susdAmount)) {
            revert SimpleSwap__TransferFailed();
        }

        if (!mockETHToken.transfer(msg.sender, mockETHAfterFee)) {
            revert SimpleSwap__TransferFailed();
        }

        // Update liquidity
        susdLiquidity += susdAmount;
        mockETHLiquidity -= mockETHAfterFee;

        // Record transaction
        _recordSwapTransaction(msg.sender, address(susdToken), address(mockETHToken), susdAmount, mockETHAfterFee);

        emit SwapExecuted(
            msg.sender, address(susdToken), address(mockETHToken), susdAmount, mockETHAfterFee, swapFee, block.timestamp
        );
    }

    /**
     * @dev Swap MockETH for SUSD (UI Swap Tab function)
     * @param mockETHAmount Amount of MockETH to swap
     * @param minSUSDOut Minimum SUSD expected (slippage protection)
     */
    function swapMockETHForSUSD(uint256 mockETHAmount, uint256 minSUSDOut) external nonReentrant {
        if (mockETHAmount == 0) revert SimpleSwap__InsufficientAmount();

        // Calculate SUSD output before fees
        uint256 susdOut = calculateSUSDOutput(mockETHAmount);

        // Calculate and deduct swap fee
        uint256 swapFee = (susdOut * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 susdAfterFee = susdOut - swapFee;

        // Slippage check
        if (susdAfterFee < minSUSDOut) {
            emit SwapFailed(msg.sender, "Slippage exceeded");
            revert SimpleSwap__SlippageExceeded();
        }

        // Liquidity check
        if (susdAfterFee > susdLiquidity) {
            emit SwapFailed(msg.sender, "Insufficient SUSD liquidity");
            revert SimpleSwap__InsufficientLiquidity();
        }

        // Execute token transfers
        if (!mockETHToken.transferFrom(msg.sender, address(this), mockETHAmount)) {
            revert SimpleSwap__TransferFailed();
        }

        if (!susdToken.transfer(msg.sender, susdAfterFee)) {
            revert SimpleSwap__TransferFailed();
        }

        // Update liquidity
        mockETHLiquidity += mockETHAmount;
        susdLiquidity -= susdAfterFee;

        // Record transaction
        _recordSwapTransaction(msg.sender, address(mockETHToken), address(susdToken), mockETHAmount, susdAfterFee);

        emit SwapExecuted(
            msg.sender, address(mockETHToken), address(susdToken), mockETHAmount, susdAfterFee, swapFee, block.timestamp
        );
    }

    /**
     * @dev Calculate MockETH output for SUSD input
     * @param susdAmount Amount of SUSD input
     * @return mockETHOutput Amount of MockETH output (before fees)
     */
    function calculateMockETHOutput(uint256 susdAmount) public pure returns (uint256 mockETHOutput) {
        // Rate: 1 SUSD = 0.00025 MockETH
        return (susdAmount * SUSD_TO_MOCKETH_RATE) / RATE_DENOMINATOR;
    }

    /**
     * @dev Calculate SUSD output for MockETH input
     * @param mockETHAmount Amount of MockETH input
     * @return susdOutput Amount of SUSD output (before fees)
     */
    function calculateSUSDOutput(uint256 mockETHAmount) public pure returns (uint256 susdOutput) {
        // Rate: 1 MockETH = 4000 SUSD
        return mockETHAmount * MOCKETH_TO_SUSD_RATE;
    }

    /**
     * @dev Get quote for SUSD -> MockETH swap including fees
     * @param susdAmount Amount of SUSD input
     * @return mockETHOut Amount of MockETH output after fees
     * @return swapFee Fee amount in MockETH
     */
    function getSwapQuoteSUSDToMockETH(uint256 susdAmount)
        external
        pure
        returns (uint256 mockETHOut, uint256 swapFee)
    {
        uint256 mockETHBeforeFee = calculateMockETHOutput(susdAmount);
        swapFee = (mockETHBeforeFee * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        mockETHOut = mockETHBeforeFee - swapFee;
    }

    /**
     * @dev Get quote for MockETH -> SUSD swap including fees
     * @param mockETHAmount Amount of MockETH input
     * @return susdOut Amount of SUSD output after fees
     * @return swapFee Fee amount in SUSD
     */
    function getSwapQuoteMockETHToSUSD(uint256 mockETHAmount)
        external
        pure
        returns (uint256 susdOut, uint256 swapFee)
    {
        uint256 susdBeforeFee = calculateSUSDOutput(mockETHAmount);
        swapFee = (susdBeforeFee * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        susdOut = susdBeforeFee - swapFee;
    }

    /**
     * @dev Get latest swap transactions for UI display
     * @param limit Number of recent transactions to return (max 50)
     * @return transactions Array of recent swap transactions
     */
    function getRecentSwaps(uint256 limit) external view returns (SwapTransaction[] memory transactions) {
        uint256 total = swapHistory.length;
        if (total == 0) {
            return new SwapTransaction[](0);
        }

        uint256 returnCount = limit > total ? total : limit;
        if (returnCount > 50) returnCount = 50; // Limit to 50 for gas efficiency

        transactions = new SwapTransaction[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            transactions[i] = swapHistory[total - 1 - i]; // Latest first
        }
    }

    /**
     * @dev Get user's swap history
     * @param user User address
     * @param limit Number of recent transactions to return
     * @return transactions Array of user's swap transactions
     */
    function getUserSwapHistory(address user, uint256 limit)
        external
        view
        returns (SwapTransaction[] memory transactions)
    {
        uint256[] memory userIndices = userSwapIndices[user];
        uint256 total = userIndices.length;

        if (total == 0) {
            return new SwapTransaction[](0);
        }

        uint256 returnCount = limit > total ? total : limit;
        if (returnCount > 20) returnCount = 20; // Limit for gas efficiency

        transactions = new SwapTransaction[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            uint256 index = userIndices[total - 1 - i]; // Latest first
            transactions[i] = swapHistory[index];
        }
    }

    /**
     * @dev Get current pool liquidity (UI display function)
     * @return susdAmount SUSD tokens in pool
     * @return mockETHAmount MockETH tokens in pool
     */
    function getPoolLiquidity() external view returns (uint256 susdAmount, uint256 mockETHAmount) {
        return (susdLiquidity, mockETHLiquidity);
    }

    /**
     * @dev Add liquidity to the pool (owner only for demo)
     * @param susdAmount Amount of SUSD to add
     * @param mockETHAmount Amount of MockETH to add
     */
    function addLiquidity(uint256 susdAmount, uint256 mockETHAmount) external onlyOwner {
        if (susdAmount == 0 || mockETHAmount == 0) {
            revert SimpleSwap__InsufficientAmount();
        }

        // Transfer tokens from owner
        if (!susdToken.transferFrom(msg.sender, address(this), susdAmount)) {
            revert SimpleSwap__TransferFailed();
        }

        if (!mockETHToken.transferFrom(msg.sender, address(this), mockETHAmount)) {
            revert SimpleSwap__TransferFailed();
        }

        // Update liquidity tracking
        susdLiquidity += susdAmount;
        mockETHLiquidity += mockETHAmount;

        emit LiquidityAdded(msg.sender, susdAmount, mockETHAmount, block.timestamp);
    }

    /**
     * @dev Internal function to record swap transaction
     */
    function _recordSwapTransaction(
        address user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    ) internal {
        SwapTransaction memory newSwap = SwapTransaction({
            user: user,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOut: amountOut,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        swapHistory.push(newSwap);
        userSwapIndices[user].push(swapHistory.length - 1);
    }

    /**
     * @dev Get total number of swaps executed
     * @return count Total swap count
     */
    function getTotalSwapCount() external view returns (uint256 count) {
        return swapHistory.length;
    }

    /**
     * @dev Emergency withdraw function (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
