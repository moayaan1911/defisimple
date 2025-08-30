// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockETH
 * @dev Mock ETH token for swapping demonstrations in DeFi ecosystem
 * @notice Used for SUSD <-> MockETH swaps at fixed rate (ETH @ $4,000)
 */
contract MockETH is ERC20, Ownable {
    // Constants for MockETH token
    uint256 public constant MAX_SUPPLY = 250_000 * 10 ** 18; // 250,000 MockETH (reasonable for demo)
    uint256 public constant MINT_AMOUNT = 10 * 10 ** 18; // 10 MockETH per mint for users
    uint256 public constant MINT_COOLDOWN = 1 hours; // 1 hour cooldown between mints

    // Mock ETH price tracking (used for UI display)
    uint256 public constant MOCK_ETH_PRICE_USD = 4000; // $4,000 per MockETH

    // Mint tracking for users
    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public totalMinted;
    uint256 public totalMockETHMinted;

    // Events for UI integration
    event MockETHMinted(address indexed user, uint256 amount, uint256 timestamp);
    event MintFailed(address indexed user, string reason);

    // Custom errors for gas efficiency
    error MockETH__MaxSupplyExceeded();
    error MockETH__MintCooldownActive();
    error MockETH__ZeroAddress();
    error MockETH__InsufficientBalance();

    constructor() ERC20("MockETH", "METH") Ownable(msg.sender) {
        // Mint initial supply to owner for distribution and swaps
        _mint(msg.sender, MAX_SUPPLY);
    }

    /**
     * @dev Mint MockETH tokens for users (UI helper function)
     * @notice Users can mint 10 MockETH once every hour for testing swaps
     */
    function mintMockETH() external {
        if (msg.sender == address(0)) revert MockETH__ZeroAddress();

        // Check cooldown period (skip for first-time minters)
        if (lastMintTime[msg.sender] != 0 && lastMintTime[msg.sender] + MINT_COOLDOWN > block.timestamp) {
            emit MintFailed(msg.sender, "Mint cooldown active");
            revert MockETH__MintCooldownActive();
        }

        // Check if owner has enough tokens to transfer
        if (balanceOf(owner()) < MINT_AMOUNT) {
            emit MintFailed(msg.sender, "Insufficient MockETH available");
            revert MockETH__InsufficientBalance();
        }

        // Transfer tokens from owner to user
        _transfer(owner(), msg.sender, MINT_AMOUNT);

        // Update mint tracking
        lastMintTime[msg.sender] = block.timestamp;
        totalMinted[msg.sender] += MINT_AMOUNT;
        totalMockETHMinted += MINT_AMOUNT;

        emit MockETHMinted(msg.sender, MINT_AMOUNT, block.timestamp);
    }

    /**
     * @dev Check if user can mint MockETH (UI helper function)
     * @param user Address to check
     * @return canMint Whether user can mint
     * @return timeLeft Seconds remaining in cooldown (0 if can mint)
     */
    function canMintMockETH(address user) external view returns (bool canMint, uint256 timeLeft) {
        // First-time minters can always mint
        if (lastMintTime[user] == 0) {
            return (true, 0);
        }

        if (lastMintTime[user] + MINT_COOLDOWN <= block.timestamp) {
            return (true, 0);
        } else {
            uint256 cooldownEnd = lastMintTime[user] + MINT_COOLDOWN;
            return (false, cooldownEnd - block.timestamp);
        }
    }

    /**
     * @dev Get user's mint statistics (UI display function)
     * @param user Address to check
     * @return minted Total MockETH minted by user
     * @return lastMint Timestamp of last mint
     * @return nextMint Timestamp when user can mint next
     */
    function getMintStats(address user) external view returns (uint256 minted, uint256 lastMint, uint256 nextMint) {
        minted = totalMinted[user];
        lastMint = lastMintTime[user];

        if (lastMint == 0) {
            nextMint = block.timestamp; // Can mint immediately if never minted
        } else {
            nextMint = lastMint + MINT_COOLDOWN;
        }
    }

    /**
     * @dev Get global MockETH statistics (UI analytics)
     * @return totalDistributed Total MockETH distributed to users
     * @return remainingForMints Remaining MockETH available for minting
     * @return currentPrice Current MockETH price in USD
     */
    function getGlobalMockETHStats()
        external
        view
        returns (uint256 totalDistributed, uint256 remainingForMints, uint256 currentPrice)
    {
        totalDistributed = totalMockETHMinted;
        remainingForMints = balanceOf(owner());
        currentPrice = MOCK_ETH_PRICE_USD;
    }

    /**
     * @dev Emergency function to mint more tokens if needed (owner only)
     * @param to Address to mint tokens to
     * @param amount Amount to mint
     */
    function emergencyMint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) revert MockETH__MaxSupplyExceeded();
        _mint(to, amount);
    }

    /**
     * @dev Burn MockETH tokens to reduce supply
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Get current MockETH price for UI display
     * @return price Current price in USD (always $4,000 for demo)
     */
    function getCurrentPrice() external pure returns (uint256 price) {
        return MOCK_ETH_PRICE_USD;
    }

    /**
     * @dev Calculate SUSD amount needed for MockETH purchase
     * @param mockETHAmount Amount of MockETH desired
     * @return susdRequired SUSD tokens required (1 SUSD = 0.00025 MockETH)
     */
    function calculateSUSDRequired(uint256 mockETHAmount) external pure returns (uint256 susdRequired) {
        // Rate: 1 SUSD = 0.00025 MockETH, so 1 MockETH = 4000 SUSD
        return mockETHAmount * 4000;
    }

    /**
     * @dev Calculate MockETH amount for SUSD input
     * @param susdAmount Amount of SUSD to swap
     * @return mockETHReceived MockETH tokens received (1 SUSD = 0.00025 MockETH)
     */
    function calculateMockETHReceived(uint256 susdAmount) external pure returns (uint256 mockETHReceived) {
        // Rate: 1 SUSD = 0.00025 MockETH
        return (susdAmount * 25) / 100000; // More precise calculation
    }

    /**
     * @dev Override decimals to ensure 18 decimals (standard for ERC20)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
