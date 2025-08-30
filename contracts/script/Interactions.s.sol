// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script, console} from "forge-std/Script.sol";
import {SimpleUSD} from "../src/SimpleUSD.sol";
import {MockETH} from "../src/MockETH.sol";
import {SimpleSwap} from "../src/SimpleSwap.sol";
/**
 * @title Interactions Script
 * @dev Handle all complex interactions that should have been automated from day 1
 * @notice This fixes the liquidity issue and sets up the contracts properly
 */
contract Interactions is Script {
    // Hardcoded Sepolia contract addresses (avoiding DevOpsTools dependency)
    address constant SIMPLE_USD_ADDRESS = 0x57C33213aE6FE2fC0b9c5d74c475F1d496A66836;
    address constant MOCK_ETH_ADDRESS = 0xE4a44C989Ca39AF437C5dE4ADbcF02BcAbdE0595;
    address constant SIMPLE_SWAP_ADDRESS = 0x0704aE35C1747D9d9dca59B143a362A6A95B8371;

    SimpleUSD simpleUSD;
    MockETH mockETH;
    SimpleSwap simpleSwap;

    function setUp() public {
        simpleUSD = SimpleUSD(SIMPLE_USD_ADDRESS);
        mockETH = MockETH(MOCK_ETH_ADDRESS);
        simpleSwap = SimpleSwap(SIMPLE_SWAP_ADDRESS);

        console.log("SimpleUSD:", SIMPLE_USD_ADDRESS);
        console.log("MockETH:", MOCK_ETH_ADDRESS);
        console.log("SimpleSwap:", SIMPLE_SWAP_ADDRESS);
    }

    /**
     * @dev Add massive liquidity to SimpleSwap (should have been done in deployment!)
     */
    function addLiquidity() public {
        vm.startBroadcast();

        // Amounts to add: 4M SUSD + 1K MockETH
        uint256 susdAmount = 4_000_000 * 10 ** 18; // 4M SUSD
        uint256 mockETHAmount = 1_000 * 10 ** 18;  // 1K MockETH

        console.log("Adding liquidity:");
        console.log("SUSD Amount:", susdAmount);
        console.log("MockETH Amount:", mockETHAmount);

        // Check balances before
        uint256 susdBalance = simpleUSD.balanceOf(msg.sender);
        uint256 mockETHBalance = mockETH.balanceOf(msg.sender);

        console.log("Owner SUSD Balance:", susdBalance);
        console.log("Owner MockETH Balance:", mockETHBalance);

        require(susdBalance >= susdAmount, "Insufficient SUSD balance");
        require(mockETHBalance >= mockETHAmount, "Insufficient MockETH balance");

        // Step 1: Approve SimpleSwap to spend SUSD
        console.log("Approving SUSD...");
        simpleUSD.approve(address(simpleSwap), susdAmount);

        // Step 2: Approve SimpleSwap to spend MockETH
        console.log("Approving MockETH...");
        mockETH.approve(address(simpleSwap), mockETHAmount);

        // Step 3: Add liquidity
        console.log("Adding liquidity to SimpleSwap...");
        simpleSwap.addLiquidity(susdAmount, mockETHAmount);

        console.log("Liquidity added successfully!");

        // Check pool liquidity after
        (uint256 poolSUSD, uint256 poolMockETH) = simpleSwap.getPoolLiquidity();
        console.log("Pool SUSD:", poolSUSD);
        console.log("Pool MockETH:", poolMockETH);

        vm.stopBroadcast();
    }

    /**
     * @dev Emergency function to claim SUSD if owner needs more
     */
    function claimSUSDForOwner() public {
        vm.startBroadcast();

        console.log("Claiming SUSD for owner...");
        simpleUSD.claimAirdrop();

        uint256 newBalance = simpleUSD.balanceOf(msg.sender);
        console.log("New SUSD Balance:", newBalance);

        vm.stopBroadcast();
    }

    /**
     * @dev Test a small swap to verify everything works
     */
    function testSwap() public {
        vm.startBroadcast();

        uint256 swapAmount = 100 * 10 ** 18; // 100 SUSD
        uint256 minOut = 0; // Accept any amount for testing

        console.log("Testing swap: 100 SUSD -> MockETH");

        // Get quote first
        (uint256 mockETHOut, uint256 fee) = simpleSwap.getSwapQuoteSUSDToMockETH(swapAmount);
        console.log("Expected MockETH out:", mockETHOut);
        console.log("Swap fee:", fee);

        // Approve and swap
        simpleUSD.approve(address(simpleSwap), swapAmount);
        simpleSwap.swapSUSDForMockETH(swapAmount, minOut);

        console.log("Test swap completed!");

        vm.stopBroadcast();
    }

    /**
     * @dev Run all setup operations in correct order
     */
    function runFullSetup() public {
        setUp();
        
        // Check if owner needs SUSD first
        uint256 ownerSUSD = simpleUSD.balanceOf(msg.sender);
        if (ownerSUSD < 4_000_000 * 10 ** 18) {
            console.log("Owner needs SUSD, claiming...");
            claimSUSDForOwner();
        }

        // Add liquidity
        addLiquidity();

        // Test a swap
        testSwap();

        console.log("Full setup completed! Swap should work now!");
    }
}