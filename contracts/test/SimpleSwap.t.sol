// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {DeploySimpleSwap} from "script/SimpleSwap.s.sol";
import {SimpleSwap} from "src/SimpleSwap.sol";
import {SimpleUSD} from "src/SimpleUSD.sol";
import {MockETH} from "src/MockETH.sol";

contract SimpleSwapTest is Test {
    SimpleSwap public simpleSwap;
    SimpleUSD public susdToken;
    MockETH public mockETHToken;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants from contracts
    uint256 public constant SUSD_TO_MOCKETH_RATE = 25;
    uint256 public constant RATE_DENOMINATOR = 100000;
    uint256 public constant MOCKETH_TO_SUSD_RATE = 4000;
    uint256 public constant SWAP_FEE_PERCENT = 30;
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Test amounts
    uint256 public constant INITIAL_LIQUIDITY_SUSD = 100000 * 10 ** 18; // 100K SUSD
    uint256 public constant INITIAL_LIQUIDITY_MOCKETH = 25 * 10 ** 18; // 25 MockETH
    uint256 public constant TEST_SUSD_AMOUNT = 1000 * 10 ** 18; // 1K SUSD
    uint256 public constant TEST_MOCKETH_AMOUNT = 1 * 10 ** 18; // 1 MockETH

    function setUp() public {
        DeploySimpleSwap deployer = new DeploySimpleSwap();
        (simpleSwap, susdToken, mockETHToken) = deployer.run();
        owner = simpleSwap.owner();

        // Setup initial liquidity
        vm.startPrank(owner);

        // Approve tokens for liquidity addition
        susdToken.approve(address(simpleSwap), INITIAL_LIQUIDITY_SUSD);
        mockETHToken.approve(address(simpleSwap), INITIAL_LIQUIDITY_MOCKETH);

        // Add initial liquidity
        simpleSwap.addLiquidity(INITIAL_LIQUIDITY_SUSD, INITIAL_LIQUIDITY_MOCKETH);

        vm.stopPrank();

        // Give test users some tokens
        vm.startPrank(owner);
        susdToken.transfer(ALICE, 10000 * 10 ** 18);
        susdToken.transfer(BOB, 10000 * 10 ** 18);
        mockETHToken.transfer(ALICE, 10 * 10 ** 18);
        mockETHToken.transfer(BOB, 10 * 10 ** 18);
        vm.stopPrank();
    }

    // Basic contract setup tests
    function testContractSetup() public view {
        assertEq(address(simpleSwap.susdToken()), address(susdToken));
        assertEq(address(simpleSwap.mockETHToken()), address(mockETHToken));
        assertEq(simpleSwap.owner(), owner);
    }

    function testInitialLiquidity() public view {
        (uint256 susdLiq, uint256 mockETHLiq) = simpleSwap.getPoolLiquidity();
        assertEq(susdLiq, INITIAL_LIQUIDITY_SUSD);
        assertEq(mockETHLiq, INITIAL_LIQUIDITY_MOCKETH);
    }

    // Rate calculation tests
    function testCalculateMockETHOutput() public view {
        uint256 susdInput = 4000 * 10 ** 18; // 4000 SUSD
        uint256 expectedMockETH = 1 * 10 ** 18; // 1 MockETH

        uint256 actualMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        assertEq(actualMockETH, expectedMockETH);
    }

    function testCalculateSUSDOutput() public view {
        uint256 mockETHInput = 1 * 10 ** 18; // 1 MockETH
        uint256 expectedSUSD = 4000 * 10 ** 18; // 4000 SUSD

        uint256 actualSUSD = simpleSwap.calculateSUSDOutput(mockETHInput);
        assertEq(actualSUSD, expectedSUSD);
    }

    function testGetSwapQuoteSUSDToMockETH() public view {
        uint256 susdInput = 4000 * 10 ** 18; // 4000 SUSD

        (uint256 mockETHOut, uint256 swapFee) = simpleSwap.getSwapQuoteSUSDToMockETH(susdInput);

        uint256 mockETHBeforeFee = 1 * 10 ** 18; // 1 MockETH
        uint256 expectedFee = (mockETHBeforeFee * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedOut = mockETHBeforeFee - expectedFee;

        assertEq(mockETHOut, expectedOut);
        assertEq(swapFee, expectedFee);
    }

    function testGetSwapQuoteMockETHToSUSD() public view {
        uint256 mockETHInput = 1 * 10 ** 18; // 1 MockETH

        (uint256 susdOut, uint256 swapFee) = simpleSwap.getSwapQuoteMockETHToSUSD(mockETHInput);

        uint256 susdBeforeFee = 4000 * 10 ** 18; // 4000 SUSD
        uint256 expectedFee = (susdBeforeFee * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedOut = susdBeforeFee - expectedFee;

        assertEq(susdOut, expectedOut);
        assertEq(swapFee, expectedFee);
    }

    // Swap functionality tests
    function testSwapSUSDForMockETH() public {
        uint256 susdInput = TEST_SUSD_AMOUNT; // 1000 SUSD
        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedMockETHAfterFee = expectedMockETH - swapFee;

        uint256 aliceInitialSUSD = susdToken.balanceOf(ALICE);
        uint256 aliceInitialMockETH = mockETHToken.balanceOf(ALICE);

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdInput);
        simpleSwap.swapSUSDForMockETH(susdInput, 0); // No slippage protection for test
        vm.stopPrank();

        assertEq(susdToken.balanceOf(ALICE), aliceInitialSUSD - susdInput);
        assertEq(mockETHToken.balanceOf(ALICE), aliceInitialMockETH + expectedMockETHAfterFee);
    }

    function testSwapMockETHForSUSD() public {
        uint256 mockETHInput = 1 * 10 ** 18; // 1 MockETH
        uint256 expectedSUSD = simpleSwap.calculateSUSDOutput(mockETHInput);
        uint256 swapFee = (expectedSUSD * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedSUSDAfterFee = expectedSUSD - swapFee;

        uint256 aliceInitialSUSD = susdToken.balanceOf(ALICE);
        uint256 aliceInitialMockETH = mockETHToken.balanceOf(ALICE);

        vm.startPrank(ALICE);
        mockETHToken.approve(address(simpleSwap), mockETHInput);
        simpleSwap.swapMockETHForSUSD(mockETHInput, 0); // No slippage protection for test
        vm.stopPrank();

        assertEq(mockETHToken.balanceOf(ALICE), aliceInitialMockETH - mockETHInput);
        assertEq(susdToken.balanceOf(ALICE), aliceInitialSUSD + expectedSUSDAfterFee);
    }

    function testSwapWithSlippageProtection() public {
        uint256 susdInput = TEST_SUSD_AMOUNT;
        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedMockETHAfterFee = expectedMockETH - swapFee;

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdInput);

        // This should succeed
        simpleSwap.swapSUSDForMockETH(susdInput, expectedMockETHAfterFee);
        vm.stopPrank();
    }

    function testSwapFailsWithHighSlippage() public {
        uint256 susdInput = TEST_SUSD_AMOUNT;
        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedMockETHAfterFee = expectedMockETH - swapFee;

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdInput);

        // This should fail due to high slippage expectation
        vm.expectRevert(SimpleSwap.SimpleSwap__SlippageExceeded.selector);
        simpleSwap.swapSUSDForMockETH(susdInput, expectedMockETHAfterFee + 1);
        vm.stopPrank();
    }

    function testSwapFailsWithInsufficientLiquidity() public {
        // Try to swap more than available liquidity
        uint256 largeSUSDAmount = 500000 * 10 ** 18; // 500K SUSD (more than available MockETH liquidity allows)

        // Give Alice enough SUSD
        vm.prank(owner);
        susdToken.transfer(ALICE, largeSUSDAmount);

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), largeSUSDAmount);

        vm.expectRevert(SimpleSwap.SimpleSwap__InsufficientLiquidity.selector);
        simpleSwap.swapSUSDForMockETH(largeSUSDAmount, 0);
        vm.stopPrank();
    }

    function testSwapEvents() public {
        uint256 susdInput = TEST_SUSD_AMOUNT;
        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedMockETHAfterFee = expectedMockETH - swapFee;

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdInput);

        vm.expectEmit(true, true, true, true);
        emit SimpleSwap.SwapExecuted(
            ALICE,
            address(susdToken),
            address(mockETHToken),
            susdInput,
            expectedMockETHAfterFee,
            swapFee,
            block.timestamp
        );

        simpleSwap.swapSUSDForMockETH(susdInput, 0);
        vm.stopPrank();
    }

    // Transaction history tests
    function testSwapRecordsTransaction() public {
        uint256 initialCount = simpleSwap.getTotalSwapCount();

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), TEST_SUSD_AMOUNT);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        vm.stopPrank();

        assertEq(simpleSwap.getTotalSwapCount(), initialCount + 1);
    }

    function testGetRecentSwaps() public {
        // Perform multiple swaps
        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), TEST_SUSD_AMOUNT * 3);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        vm.stopPrank();

        SimpleSwap.SwapTransaction[] memory recentSwaps = simpleSwap.getRecentSwaps(3);
        assertEq(recentSwaps.length, 3);

        // Check that latest swap is first (reverse chronological order)
        assertTrue(recentSwaps[0].timestamp >= recentSwaps[1].timestamp);
        assertTrue(recentSwaps[1].timestamp >= recentSwaps[2].timestamp);
    }

    function testGetUserSwapHistory() public {
        // Alice performs swaps
        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), TEST_SUSD_AMOUNT * 2);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        vm.stopPrank();

        // Bob performs a swap
        vm.startPrank(BOB);
        susdToken.approve(address(simpleSwap), TEST_SUSD_AMOUNT);
        simpleSwap.swapSUSDForMockETH(TEST_SUSD_AMOUNT, 0);
        vm.stopPrank();

        SimpleSwap.SwapTransaction[] memory aliceSwaps = simpleSwap.getUserSwapHistory(ALICE, 10);
        SimpleSwap.SwapTransaction[] memory bobSwaps = simpleSwap.getUserSwapHistory(BOB, 10);

        assertEq(aliceSwaps.length, 2);
        assertEq(bobSwaps.length, 1);

        // Verify Alice's swaps are hers
        assertEq(aliceSwaps[0].user, ALICE);
        assertEq(aliceSwaps[1].user, ALICE);
        assertEq(bobSwaps[0].user, BOB);
    }

    // Liquidity management tests
    function testAddLiquidity() public {
        uint256 additionalSUSD = 1000 * 10 ** 18;
        uint256 additionalMockETH = 1 * 10 ** 18;

        (uint256 initialSUSD, uint256 initialMockETH) = simpleSwap.getPoolLiquidity();

        vm.startPrank(owner);
        susdToken.approve(address(simpleSwap), additionalSUSD);
        mockETHToken.approve(address(simpleSwap), additionalMockETH);

        simpleSwap.addLiquidity(additionalSUSD, additionalMockETH);
        vm.stopPrank();

        (uint256 finalSUSD, uint256 finalMockETH) = simpleSwap.getPoolLiquidity();

        assertEq(finalSUSD, initialSUSD + additionalSUSD);
        assertEq(finalMockETH, initialMockETH + additionalMockETH);
    }

    function testAddLiquidityOnlyOwner() public {
        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), 1000 * 10 ** 18);

        vm.expectRevert();
        simpleSwap.addLiquidity(1000 * 10 ** 18, 1 * 10 ** 18);
        vm.stopPrank();
    }

    function testLiquidityUpdateAfterSwaps() public {
        (uint256 initialSUSD, uint256 initialMockETH) = simpleSwap.getPoolLiquidity();

        uint256 susdInput = TEST_SUSD_AMOUNT;
        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdInput);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 mockETHOut = expectedMockETH - swapFee;

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdInput);
        simpleSwap.swapSUSDForMockETH(susdInput, 0);
        vm.stopPrank();

        (uint256 finalSUSD, uint256 finalMockETH) = simpleSwap.getPoolLiquidity();

        assertEq(finalSUSD, initialSUSD + susdInput);
        assertEq(finalMockETH, initialMockETH - mockETHOut);
    }

    // Error condition tests
    function testSwapWithZeroAmount() public {
        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), 0);

        vm.expectRevert(SimpleSwap.SimpleSwap__InsufficientAmount.selector);
        simpleSwap.swapSUSDForMockETH(0, 0);
        vm.stopPrank();
    }

    function testEmergencyWithdraw() public {
        uint256 withdrawAmount = 100 * 10 ** 18;

        uint256 ownerInitialBalance = susdToken.balanceOf(owner);

        vm.prank(owner);
        simpleSwap.emergencyWithdraw(address(susdToken), withdrawAmount);

        assertEq(susdToken.balanceOf(owner), ownerInitialBalance + withdrawAmount);
    }

    function testEmergencyWithdrawOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleSwap.emergencyWithdraw(address(susdToken), 100 * 10 ** 18);
    }

    // Fuzzing tests
    function testFuzzSwapSUSDForMockETH(uint256 susdAmount) public {
        susdAmount = bound(susdAmount, 1 * 10 ** 18, 10000 * 10 ** 18); // 1 to 10K SUSD

        // Give Alice enough SUSD
        vm.prank(owner);
        susdToken.transfer(ALICE, susdAmount);

        uint256 expectedMockETH = simpleSwap.calculateMockETHOutput(susdAmount);
        uint256 swapFee = (expectedMockETH * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedMockETHAfterFee = expectedMockETH - swapFee;

        // Skip if not enough liquidity
        (, uint256 mockETHLiquidity) = simpleSwap.getPoolLiquidity();
        if (expectedMockETHAfterFee > mockETHLiquidity) {
            return;
        }

        uint256 aliceInitialMockETH = mockETHToken.balanceOf(ALICE);

        vm.startPrank(ALICE);
        susdToken.approve(address(simpleSwap), susdAmount);
        simpleSwap.swapSUSDForMockETH(susdAmount, 0);
        vm.stopPrank();

        assertEq(mockETHToken.balanceOf(ALICE), aliceInitialMockETH + expectedMockETHAfterFee);
    }

    function testFuzzSwapMockETHForSUSD(uint256 mockETHAmount) public {
        mockETHAmount = bound(mockETHAmount, 1 * 10 ** 16, 5 * 10 ** 18); // 0.01 to 5 MockETH

        // Give Alice enough MockETH
        vm.prank(owner);
        mockETHToken.transfer(ALICE, mockETHAmount);

        uint256 expectedSUSD = simpleSwap.calculateSUSDOutput(mockETHAmount);
        uint256 swapFee = (expectedSUSD * SWAP_FEE_PERCENT) / FEE_DENOMINATOR;
        uint256 expectedSUSDAfterFee = expectedSUSD - swapFee;

        // Skip if not enough liquidity
        (uint256 susdLiquidity,) = simpleSwap.getPoolLiquidity();
        if (expectedSUSDAfterFee > susdLiquidity) {
            return;
        }

        uint256 aliceInitialSUSD = susdToken.balanceOf(ALICE);

        vm.startPrank(ALICE);
        mockETHToken.approve(address(simpleSwap), mockETHAmount);
        simpleSwap.swapMockETHForSUSD(mockETHAmount, 0);
        vm.stopPrank();

        assertEq(susdToken.balanceOf(ALICE), aliceInitialSUSD + expectedSUSDAfterFee);
    }
}
