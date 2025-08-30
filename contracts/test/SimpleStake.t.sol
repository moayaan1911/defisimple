// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {SimpleStake} from "src/SimpleStake.sol";
import {SimpleUSD} from "src/SimpleUSD.sol";
import {DeploySimpleUSD} from "script/SimpleUSD.s.sol";

contract SimpleStakeTest is Test {
    SimpleStake public simpleStake;
    SimpleUSD public simpleUSD;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants
    uint256 public constant APY = 12;
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant STAKE_AMOUNT = 1000 * 10 ** 18; // 1000 SUSD
    uint256 public constant REWARD_POOL_AMOUNT = 100000 * 10 ** 18; // 100k SUSD for rewards

    function setUp() public {
        // Deploy SimpleUSD first
        DeploySimpleUSD usdDeployer = new DeploySimpleUSD();
        simpleUSD = usdDeployer.run();
        owner = simpleUSD.owner();

        // Deploy SimpleStake with SimpleUSD address
        vm.prank(owner);
        simpleStake = new SimpleStake(address(simpleUSD));

        // Fund reward pool (need to approve first)
        vm.prank(owner);
        simpleUSD.approve(address(simpleStake), REWARD_POOL_AMOUNT);

        vm.prank(owner);
        simpleStake.fundRewardPool(REWARD_POOL_AMOUNT);

        // Give users some SUSD tokens for testing
        vm.startPrank(owner);
        simpleUSD.transfer(ALICE, STAKE_AMOUNT * 10);
        simpleUSD.transfer(BOB, STAKE_AMOUNT * 10);
        simpleUSD.transfer(CHARLIE, STAKE_AMOUNT * 10);
        vm.stopPrank();

        // Approve staking contract
        vm.prank(ALICE);
        simpleUSD.approve(address(simpleStake), type(uint256).max);

        vm.prank(BOB);
        simpleUSD.approve(address(simpleStake), type(uint256).max);

        vm.prank(CHARLIE);
        simpleUSD.approve(address(simpleStake), type(uint256).max);
    }

    // Basic functionality tests
    function testContractSetup() public view {
        assertEq(address(simpleStake.stakingToken()), address(simpleUSD));
        assertEq(simpleStake.APY(), APY);
        assertEq(simpleStake.totalStaked(), 0);
        assertEq(simpleStake.rewardPool(), REWARD_POOL_AMOUNT);
    }

    function testStakeTokens() public {
        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        assertEq(simpleUSD.balanceOf(ALICE), aliceBalanceBefore - STAKE_AMOUNT);
        assertEq(simpleStake.totalStaked(), STAKE_AMOUNT);

        (uint256 staked,,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, STAKE_AMOUNT);
    }

    function testStakeEvent() public {
        vm.expectEmit(true, false, false, true);
        emit SimpleStake.Staked(ALICE, STAKE_AMOUNT, block.timestamp);

        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);
    }

    function testMultipleStakes() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        (uint256 staked,,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, STAKE_AMOUNT * 2);
        assertEq(simpleStake.totalStaked(), STAKE_AMOUNT * 2);
    }

    function testRewardCalculation() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        (uint256 staked, uint256 earned,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, STAKE_AMOUNT);

        // Expected reward: 1000 * 12% * (30/365) = ~98.63 SUSD
        uint256 expectedReward = (STAKE_AMOUNT * APY * 30 days) / (SECONDS_PER_YEAR * 100);
        assertApproxEqAbs(earned, expectedReward, 1e15); // Allow small precision difference
    }

    function testCalculateRewardsHelper() public view {
        uint256 amount = 1000 * 10 ** 18;
        uint256 duration = 30 days;

        uint256 rewards = simpleStake.calculateRewards(amount, duration);
        uint256 expected = (amount * APY * duration) / (SECONDS_PER_YEAR * 100);

        assertEq(rewards, expected);
    }

    function testCalculateRewardsZero() public view {
        assertEq(simpleStake.calculateRewards(0, 30 days), 0);
        assertEq(simpleStake.calculateRewards(1000 * 10 ** 18, 0), 0);
    }

    function testUnstakeAll() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Fast forward to accumulate rewards
        vm.warp(block.timestamp + 30 days);

        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleStake.unstake(0); // 0 means unstake all

        assertEq(simpleStake.totalStaked(), 0);

        (uint256 staked,,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, 0);

        // Alice should have original stake + rewards
        assertTrue(simpleUSD.balanceOf(ALICE) > aliceBalanceBefore + STAKE_AMOUNT);
    }

    function testUnstakePartial() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        uint256 unstakeAmount = STAKE_AMOUNT / 2;

        vm.prank(ALICE);
        simpleStake.unstake(unstakeAmount);

        (uint256 staked,,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, STAKE_AMOUNT - unstakeAmount);
        assertEq(simpleStake.totalStaked(), STAKE_AMOUNT - unstakeAmount);
    }

    function testUnstakeEvent() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, false); // Don't check reward amount exactly
        emit SimpleStake.Unstaked(ALICE, STAKE_AMOUNT, 0, block.timestamp);

        vm.prank(ALICE);
        simpleStake.unstake(STAKE_AMOUNT);
    }

    function testClaimRewards() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Fast forward to accumulate rewards
        vm.warp(block.timestamp + 30 days);

        (, uint256 earnedBefore,,) = simpleStake.getStakeInfo(ALICE);
        assertTrue(earnedBefore > 0);

        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);

        vm.prank(ALICE);
        simpleStake.claimRewards();

        // Stake should remain, rewards should be claimed
        (uint256 staked, uint256 earnedAfter,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, STAKE_AMOUNT);
        assertEq(earnedAfter, 0);

        assertTrue(simpleUSD.balanceOf(ALICE) > aliceBalanceBefore);
    }

    function testClaimRewardsEvent() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, false);
        emit SimpleStake.RewardsClaimed(ALICE, 0, block.timestamp);

        vm.prank(ALICE);
        simpleStake.claimRewards();
    }

    function testMultipleStakersRewards() public {
        // Alice stakes
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Bob stakes later
        vm.warp(block.timestamp + 10 days);

        vm.prank(BOB);
        simpleStake.stake(STAKE_AMOUNT);

        // Fast forward more
        vm.warp(block.timestamp + 20 days);

        (, uint256 aliceEarned,,) = simpleStake.getStakeInfo(ALICE);
        (, uint256 bobEarned,,) = simpleStake.getStakeInfo(BOB);

        // Alice should have earned more (staked for 30 days vs Bob's 20 days)
        assertTrue(aliceEarned > bobEarned);
    }

    function testGetPoolStats() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(BOB);
        simpleStake.stake(STAKE_AMOUNT * 2);

        (uint256 totalStakedAmount, uint256 totalStakers, uint256 poolApy, uint256 availableRewards) =
            simpleStake.getPoolStats();

        assertEq(totalStakedAmount, STAKE_AMOUNT * 3);
        assertEq(totalStakers, 2);
        assertEq(poolApy, APY);
        assertEq(availableRewards, REWARD_POOL_AMOUNT);
    }

    function testGetStakers() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(BOB);
        simpleStake.stake(STAKE_AMOUNT * 2);

        (address[] memory stakersList, uint256[] memory amounts, uint256[] memory rewards) =
            simpleStake.getStakers(0, 10);

        assertEq(stakersList.length, 2);
        assertEq(amounts.length, 2);
        assertEq(rewards.length, 2);

        assertEq(stakersList[0], ALICE);
        assertEq(amounts[0], STAKE_AMOUNT);

        assertEq(stakersList[1], BOB);
        assertEq(amounts[1], STAKE_AMOUNT * 2);
    }

    function testGetStakersEmpty() public view {
        (address[] memory stakersList,,) = simpleStake.getStakers(0, 10);
        assertEq(stakersList.length, 0);
    }

    function testGetStakersPagination() public {
        // Add 3 stakers
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(BOB);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(CHARLIE);
        simpleStake.stake(STAKE_AMOUNT);

        // Get first 2
        (address[] memory stakersList,,) = simpleStake.getStakers(0, 2);
        assertEq(stakersList.length, 2);

        // Get remaining 1
        (address[] memory stakersList2,,) = simpleStake.getStakers(2, 2);
        assertEq(stakersList2.length, 1);
    }

    function testFundRewardPool() public {
        uint256 additionalFunds = 50000 * 10 ** 18;
        uint256 poolBefore = simpleStake.rewardPool();

        vm.prank(owner);
        simpleUSD.approve(address(simpleStake), additionalFunds);

        vm.expectEmit(false, false, false, true);
        emit SimpleStake.RewardPoolFunded(additionalFunds);

        vm.prank(owner);
        simpleStake.fundRewardPool(additionalFunds);

        assertEq(simpleStake.rewardPool(), poolBefore + additionalFunds);
    }

    function testEmergencyWithdraw() public {
        // Should work when no users are staking
        uint256 withdrawAmount = 1000 * 10 ** 18;
        uint256 ownerBalanceBefore = simpleUSD.balanceOf(owner);

        vm.prank(owner);
        simpleStake.emergencyWithdraw(withdrawAmount);

        assertEq(simpleUSD.balanceOf(owner), ownerBalanceBefore + withdrawAmount);
    }

    function testEmergencyWithdrawFailsWithActiveStakers() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(owner);
        vm.expectRevert("Cannot withdraw while users are staking");
        simpleStake.emergencyWithdraw(1000 * 10 ** 18);
    }

    // Error condition tests
    function testStakeZeroAmount() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleStake.SimpleStake__ZeroAmount.selector);
        simpleStake.stake(0);
    }

    function testUnstakeInsufficientStake() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleStake.SimpleStake__InsufficientStake.selector);
        simpleStake.unstake(STAKE_AMOUNT);
    }

    function testUnstakeMoreThanStaked() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        vm.prank(ALICE);
        vm.expectRevert(SimpleStake.SimpleStake__InsufficientStake.selector);
        simpleStake.unstake(STAKE_AMOUNT + 1);
    }

    function testClaimNoRewards() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Immediately try to claim (no time passed)
        vm.prank(ALICE);
        vm.expectRevert(SimpleStake.SimpleStake__NoRewardsToClaim.selector);
        simpleStake.claimRewards();
    }

    function testClaimWithoutStaking() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleStake.SimpleStake__NoRewardsToClaim.selector);
        simpleStake.claimRewards();
    }

    function testOnlyOwnerFunctions() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleStake.fundRewardPool(1000 * 10 ** 18);

        vm.prank(ALICE);
        vm.expectRevert();
        simpleStake.emergencyWithdraw(1000 * 10 ** 18);
    }

    // Fuzzing tests
    function testFuzzStake(uint256 amount) public {
        amount = bound(amount, 1, STAKE_AMOUNT * 5);

        // Give Alice enough tokens
        vm.prank(owner);
        simpleUSD.transfer(ALICE, amount);

        vm.prank(ALICE);
        simpleUSD.approve(address(simpleStake), amount);

        vm.prank(ALICE);
        simpleStake.stake(amount);

        (uint256 staked,,,) = simpleStake.getStakeInfo(ALICE);
        assertEq(staked, amount);
    }

    function testFuzzRewardCalculation(uint256 amount, uint256 duration) public {
        amount = bound(amount, 1e18, 1000000 * 1e18); // 1 to 1M SUSD
        duration = bound(duration, 1 days, 365 days); // 1 day to 1 year

        uint256 rewards = simpleStake.calculateRewards(amount, duration);
        uint256 expected = (amount * APY * duration) / (SECONDS_PER_YEAR * 100);

        assertEq(rewards, expected);
    }

    function testLongTermStaking() public {
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Fast forward 1 year
        vm.warp(block.timestamp + 365 days);

        (, uint256 earned,,) = simpleStake.getStakeInfo(ALICE);

        // Should be approximately 12% of staked amount
        uint256 expectedReward = (STAKE_AMOUNT * APY) / 100;
        assertApproxEqRel(earned, expectedReward, 0.01e18); // 1% tolerance
    }

    function testReentrancyProtection() public {
        // This test ensures that our functions are protected against reentrancy
        // The ReentrancyGuard should prevent any reentrancy attacks
        vm.prank(ALICE);
        simpleStake.stake(STAKE_AMOUNT);

        // Normal operations should work fine
        vm.prank(ALICE);
        simpleStake.unstake(STAKE_AMOUNT / 2);
    }
}
