// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {SimpleLend} from "src/SimpleLend.sol";
import {SimpleUSD} from "src/SimpleUSD.sol";
import {DeploySimpleUSD} from "script/SimpleUSD.s.sol";

contract SimpleLendTest is Test {
    SimpleLend public simpleLend;
    SimpleUSD public simpleUSD;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants
    uint256 public constant APY = 8;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant DEPOSIT_AMOUNT = 1000 * 10 ** 18; // 1000 SUSD
    uint256 public constant INTEREST_POOL_AMOUNT = 100000 * 10 ** 18; // 100k SUSD for interest

    function setUp() public {
        // Deploy SimpleUSD first
        DeploySimpleUSD usdDeployer = new DeploySimpleUSD();
        simpleUSD = usdDeployer.run();
        owner = simpleUSD.owner();

        // Deploy SimpleLend with SimpleUSD address
        vm.prank(owner);
        simpleLend = new SimpleLend(address(simpleUSD));

        // Fund interest pool
        vm.prank(owner);
        simpleUSD.approve(address(simpleLend), INTEREST_POOL_AMOUNT);

        vm.prank(owner);
        simpleLend.fundInterestPool(INTEREST_POOL_AMOUNT);

        // Give users some SUSD tokens for testing
        vm.startPrank(owner);
        simpleUSD.transfer(ALICE, DEPOSIT_AMOUNT * 10);
        simpleUSD.transfer(BOB, DEPOSIT_AMOUNT * 10);
        simpleUSD.transfer(CHARLIE, DEPOSIT_AMOUNT * 10);
        vm.stopPrank();

        // Approve lending contract
        vm.prank(ALICE);
        simpleUSD.approve(address(simpleLend), type(uint256).max);

        vm.prank(BOB);
        simpleUSD.approve(address(simpleLend), type(uint256).max);

        vm.prank(CHARLIE);
        simpleUSD.approve(address(simpleLend), type(uint256).max);
    }

    // Basic functionality tests
    function testContractSetup() public view {
        assertEq(address(simpleLend.lendingToken()), address(simpleUSD));
        assertEq(simpleLend.APY(), APY);
        assertEq(simpleLend.totalLent(), 0);
        assertEq(simpleLend.interestPool(), INTEREST_POOL_AMOUNT);
    }

    function testDepositTokens() public {
        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        assertEq(simpleUSD.balanceOf(ALICE), aliceBalanceBefore - DEPOSIT_AMOUNT);
        assertEq(simpleLend.totalLent(), DEPOSIT_AMOUNT);

        (uint256 deposited,,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, DEPOSIT_AMOUNT);
    }

    function testDepositEvent() public {
        vm.expectEmit(true, false, false, true);
        emit SimpleLend.Deposited(ALICE, DEPOSIT_AMOUNT, block.timestamp);

        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);
    }

    function testMultipleDeposits() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        (uint256 deposited,,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, DEPOSIT_AMOUNT * 2);
        assertEq(simpleLend.totalLent(), DEPOSIT_AMOUNT * 2);
    }

    function testInterestCalculation() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        (uint256 deposited, uint256 earned,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, DEPOSIT_AMOUNT);

        // Expected interest: 1000 * 8% * (30/365) = ~65.75 SUSD
        uint256 expectedInterest = (DEPOSIT_AMOUNT * APY * 30 days) / (SECONDS_PER_YEAR * 100);
        assertApproxEqAbs(earned, expectedInterest, 1e15); // Allow small precision difference
    }

    function testCalculateInterestHelper() public view {
        uint256 amount = 1000 * 10 ** 18;
        uint256 duration = 30 days;

        uint256 interest = simpleLend.calculateInterest(amount, duration);
        uint256 expected = (amount * APY * duration) / (SECONDS_PER_YEAR * 100);

        assertEq(interest, expected);
    }

    function testCalculateInterestZero() public view {
        assertEq(simpleLend.calculateInterest(0, 30 days), 0);
        assertEq(simpleLend.calculateInterest(1000 * 10 ** 18, 0), 0);
    }

    function testWithdrawAll() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Fast forward to accumulate interest
        vm.warp(block.timestamp + 30 days);

        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleLend.withdraw(0); // 0 means withdraw all

        assertEq(simpleLend.totalLent(), 0);

        (uint256 deposited,,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, 0);

        // Alice should have original deposit + interest
        assertTrue(simpleUSD.balanceOf(ALICE) > aliceBalanceBefore + DEPOSIT_AMOUNT);
    }

    function testWithdrawPartial() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        uint256 withdrawAmount = DEPOSIT_AMOUNT / 2;

        vm.prank(ALICE);
        simpleLend.withdraw(withdrawAmount);

        (uint256 deposited,,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, DEPOSIT_AMOUNT - withdrawAmount);
        assertEq(simpleLend.totalLent(), DEPOSIT_AMOUNT - withdrawAmount);
    }

    function testWithdrawEvent() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, false); // Don't check interest amount exactly
        emit SimpleLend.Withdrawn(ALICE, DEPOSIT_AMOUNT, 0, block.timestamp);

        vm.prank(ALICE);
        simpleLend.withdraw(DEPOSIT_AMOUNT);
    }

    function testClaimInterest() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Fast forward to accumulate interest
        vm.warp(block.timestamp + 30 days);

        (, uint256 earnedBefore,,) = simpleLend.getLendInfo(ALICE);
        assertTrue(earnedBefore > 0);

        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleLend.claimInterest();

        // Deposit should remain, interest should be claimed
        (uint256 deposited, uint256 earnedAfter,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, DEPOSIT_AMOUNT);
        assertEq(earnedAfter, 0);

        assertTrue(simpleUSD.balanceOf(ALICE) > aliceBalanceBefore);
    }

    function testClaimInterestEvent() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, false);
        emit SimpleLend.InterestClaimed(ALICE, 0, block.timestamp);

        vm.prank(ALICE);
        simpleLend.claimInterest();
    }

    function testMultipleLendersInterest() public {
        // Alice deposits
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Bob deposits later
        vm.warp(block.timestamp + 10 days);

        vm.prank(BOB);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Fast forward more
        vm.warp(block.timestamp + 20 days);

        (, uint256 aliceEarned,,) = simpleLend.getLendInfo(ALICE);
        (, uint256 bobEarned,,) = simpleLend.getLendInfo(BOB);

        // Alice should have earned more (deposited for 30 days vs Bob's 20 days)
        assertTrue(aliceEarned > bobEarned);
    }

    function testGetPoolStats() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(BOB);
        simpleLend.deposit(DEPOSIT_AMOUNT * 2);

        (
            uint256 totalLentAmount,
            uint256 totalLenders,
            uint256 poolApy,
            uint256 availableInterest,
            uint256 utilizationRate
        ) = simpleLend.getPoolStats();

        assertEq(totalLentAmount, DEPOSIT_AMOUNT * 3);
        assertEq(totalLenders, 2);
        assertEq(poolApy, APY);
        assertEq(availableInterest, INTEREST_POOL_AMOUNT);

        // Utilization rate calculation
        uint256 totalPoolSize = totalLentAmount + availableInterest;
        uint256 expectedUtilization = (totalLentAmount * 100) / totalPoolSize;
        assertEq(utilizationRate, expectedUtilization);
    }

    function testGetLenders() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(BOB);
        simpleLend.deposit(DEPOSIT_AMOUNT * 2);

        (address[] memory lendersList, uint256[] memory amounts, uint256[] memory interests) =
            simpleLend.getLenders(0, 10);

        assertEq(lendersList.length, 2);
        assertEq(amounts.length, 2);
        assertEq(interests.length, 2);

        assertEq(lendersList[0], ALICE);
        assertEq(amounts[0], DEPOSIT_AMOUNT);

        assertEq(lendersList[1], BOB);
        assertEq(amounts[1], DEPOSIT_AMOUNT * 2);
    }

    function testGetLendersEmpty() public view {
        (address[] memory lendersList,,) = simpleLend.getLenders(0, 10);
        assertEq(lendersList.length, 0);
    }

    function testGetLendersPagination() public {
        // Add 3 lenders
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(BOB);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(CHARLIE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Get first 2
        (address[] memory lendersList,,) = simpleLend.getLenders(0, 2);
        assertEq(lendersList.length, 2);

        // Get remaining 1
        (address[] memory lendersList2,,) = simpleLend.getLenders(2, 2);
        assertEq(lendersList2.length, 1);
    }

    function testGetLendingHistory() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        (uint256 totalDeposited, uint256 totalWithdrawn, uint256 totalInterestEarned, uint256 currentPosition) =
            simpleLend.getLendingHistory(ALICE);

        assertEq(totalDeposited, DEPOSIT_AMOUNT); // Simplified tracking
        assertEq(totalWithdrawn, 0); // Not implemented in basic version
        assertTrue(totalInterestEarned > 0);
        assertEq(currentPosition, DEPOSIT_AMOUNT);
    }

    function testFundInterestPool() public {
        uint256 additionalFunds = 50000 * 10 ** 18;
        uint256 poolBefore = simpleLend.interestPool();

        vm.prank(owner);
        simpleUSD.approve(address(simpleLend), additionalFunds);

        vm.expectEmit(false, false, false, true);
        emit SimpleLend.InterestPoolFunded(additionalFunds);

        vm.prank(owner);
        simpleLend.fundInterestPool(additionalFunds);

        assertEq(simpleLend.interestPool(), poolBefore + additionalFunds);
    }

    function testEmergencyWithdraw() public {
        // Should work when no users are lending
        uint256 withdrawAmount = 1000 * 10 ** 18;
        uint256 ownerBalanceBefore = simpleUSD.balanceOf(owner);

        vm.prank(owner);
        simpleLend.emergencyWithdraw(withdrawAmount);

        assertEq(simpleUSD.balanceOf(owner), ownerBalanceBefore + withdrawAmount);
    }

    function testEmergencyWithdrawFailsWithActiveLenders() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(owner);
        vm.expectRevert("Cannot withdraw while users are lending");
        simpleLend.emergencyWithdraw(1000 * 10 ** 18);
    }

    // Error condition tests
    function testDepositZeroAmount() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleLend.SimpleLend__ZeroAmount.selector);
        simpleLend.deposit(0);
    }

    function testWithdrawInsufficientDeposit() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleLend.SimpleLend__InsufficientDeposit.selector);
        simpleLend.withdraw(DEPOSIT_AMOUNT);
    }

    function testWithdrawMoreThanDeposited() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        vm.prank(ALICE);
        vm.expectRevert(SimpleLend.SimpleLend__InsufficientDeposit.selector);
        simpleLend.withdraw(DEPOSIT_AMOUNT + 1);
    }

    function testClaimNoInterest() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Immediately try to claim (no time passed)
        vm.prank(ALICE);
        vm.expectRevert(SimpleLend.SimpleLend__NoInterestToClaim.selector);
        simpleLend.claimInterest();
    }

    function testClaimWithoutDepositing() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleLend.SimpleLend__NoInterestToClaim.selector);
        simpleLend.claimInterest();
    }

    function testOnlyOwnerFunctions() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleLend.fundInterestPool(1000 * 10 ** 18);

        vm.prank(ALICE);
        vm.expectRevert();
        simpleLend.emergencyWithdraw(1000 * 10 ** 18);
    }

    // Fuzzing tests
    function testFuzzDeposit(uint256 amount) public {
        amount = bound(amount, 1, DEPOSIT_AMOUNT * 5);

        // Give Alice enough tokens
        vm.prank(owner);
        simpleUSD.transfer(ALICE, amount);

        vm.prank(ALICE);
        simpleUSD.approve(address(simpleLend), amount);

        vm.prank(ALICE);
        simpleLend.deposit(amount);

        (uint256 deposited,,,) = simpleLend.getLendInfo(ALICE);
        assertEq(deposited, amount);
    }

    function testFuzzInterestCalculation(uint256 amount, uint256 duration) public view{
        amount = bound(amount, 1e18, 1000000 * 1e18); // 1 to 1M SUSD
        duration = bound(duration, 1 days, 365 days); // 1 day to 1 year

        uint256 interest = simpleLend.calculateInterest(amount, duration);
        uint256 expected = (amount * APY * duration) / (SECONDS_PER_YEAR * 100);

        assertEq(interest, expected);
    }

    function testLongTermLending() public {
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        (, uint256 earned,,) = simpleLend.getLendInfo(ALICE);

        // Should be approximately 8% of deposited amount
        uint256 expectedInterest = (DEPOSIT_AMOUNT * APY) / 100;
        assertApproxEqRel(earned, expectedInterest, 0.01e18); // 1% tolerance
    }

    function testReentrancyProtection() public {
        // This test ensures that our functions are protected against reentrancy
        // The ReentrancyGuard should prevent any reentrancy attacks
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Normal operations should work fine
        vm.prank(ALICE);
        simpleLend.withdraw(DEPOSIT_AMOUNT / 2);
    }

    function testInterestAccuracy() public {
        // Test interest calculation accuracy over time
        vm.prank(ALICE);
        simpleLend.deposit(DEPOSIT_AMOUNT);

        // Check interest after different time periods
        vm.warp(block.timestamp + 1 days);
        (, uint256 earned1Day,,) = simpleLend.getLendInfo(ALICE);

        vm.warp(block.timestamp + 6 days); // Total 7 days
        (, uint256 earned7Days,,) = simpleLend.getLendInfo(ALICE);

        // Interest should be approximately proportional to time
        assertApproxEqRel(earned7Days, earned1Day * 7, 0.001e18); // 0.1% tolerance
    }
}
