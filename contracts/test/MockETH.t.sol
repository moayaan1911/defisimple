// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {DeployMockETH} from "script/MockETH.s.sol";
import {MockETH} from "src/MockETH.sol";

contract MockETHTest is Test {
    MockETH public mockETH;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants from contract
    uint256 public constant MAX_SUPPLY = 250_000 * 10 ** 18;
    uint256 public constant MINT_AMOUNT = 10 * 10 ** 18;
    uint256 public constant MINT_COOLDOWN = 1 hours;
    uint256 public constant MOCK_ETH_PRICE_USD = 4000;

    function setUp() public {
        DeployMockETH deployer = new DeployMockETH();
        mockETH = deployer.run();
        owner = mockETH.owner();
    }

    // Basic ERC20 functionality tests
    function testTokenMetadata() public view {
        assertEq(mockETH.name(), "MockETH");
        assertEq(mockETH.symbol(), "METH");
        assertEq(mockETH.decimals(), 18);
    }

    function testInitialSupply() public view {
        assertEq(mockETH.totalSupply(), MAX_SUPPLY);
        assertEq(mockETH.balanceOf(owner), MAX_SUPPLY);
    }

    function testTransfer() public {
        uint256 transferAmount = 5 * 10 ** 18;

        vm.prank(owner);
        mockETH.transfer(ALICE, transferAmount);

        assertEq(mockETH.balanceOf(ALICE), transferAmount);
        assertEq(mockETH.balanceOf(owner), MAX_SUPPLY - transferAmount);
    }

    function testAllowanceAndTransferFrom() public {
        uint256 allowanceAmount = 20 * 10 ** 18;
        uint256 transferAmount = 8 * 10 ** 18;

        // Give Alice some tokens first
        vm.prank(owner);
        mockETH.transfer(ALICE, allowanceAmount);

        // Alice approves Bob to spend her tokens
        vm.prank(ALICE);
        mockETH.approve(BOB, allowanceAmount);

        // Bob transfers from Alice to Charlie
        vm.prank(BOB);
        mockETH.transferFrom(ALICE, CHARLIE, transferAmount);

        assertEq(mockETH.balanceOf(CHARLIE), transferAmount);
        assertEq(mockETH.balanceOf(ALICE), allowanceAmount - transferAmount);
        assertEq(mockETH.allowance(ALICE, BOB), allowanceAmount - transferAmount);
    }

    // MockETH minting functionality tests
    function testMockETHMint() public {
        uint256 initialBalance = mockETH.balanceOf(ALICE);

        vm.prank(ALICE);
        mockETH.mintMockETH();

        assertEq(mockETH.balanceOf(ALICE), initialBalance + MINT_AMOUNT);
        assertEq(mockETH.totalMinted(ALICE), MINT_AMOUNT);
        assertTrue(mockETH.lastMintTime(ALICE) > 0);
    }

    function testMockETHMintEvent() public {
        vm.expectEmit(true, false, false, true);
        emit MockETH.MockETHMinted(ALICE, MINT_AMOUNT, block.timestamp);

        vm.prank(ALICE);
        mockETH.mintMockETH();
    }

    function testMintCooldown() public {
        // Alice mints first MockETH
        vm.prank(ALICE);
        mockETH.mintMockETH();

        // Try to mint again immediately - should fail
        vm.prank(ALICE);
        vm.expectRevert(MockETH.MockETH__MintCooldownActive.selector);
        mockETH.mintMockETH();

        // Fast forward 1 hour
        vm.warp(block.timestamp + MINT_COOLDOWN);

        // Should be able to mint again
        vm.prank(ALICE);
        mockETH.mintMockETH();

        assertEq(mockETH.totalMinted(ALICE), MINT_AMOUNT * 2);
    }

    function testCanMintMockETHHelper() public {
        // Initially should be able to mint
        (bool canMint, uint256 timeLeft) = mockETH.canMintMockETH(ALICE);
        assertTrue(canMint);
        assertEq(timeLeft, 0);

        // After minting, should not be able to mint
        vm.prank(ALICE);
        mockETH.mintMockETH();

        (canMint, timeLeft) = mockETH.canMintMockETH(ALICE);
        assertFalse(canMint);
        assertTrue(timeLeft > 0);

        // After cooldown, should be able to mint again
        vm.warp(block.timestamp + MINT_COOLDOWN);
        (canMint, timeLeft) = mockETH.canMintMockETH(ALICE);
        assertTrue(canMint);
        assertEq(timeLeft, 0);
    }

    function testGetMintStats() public {
        // Before any mints
        (uint256 minted, uint256 lastMint, uint256 nextMint) = mockETH.getMintStats(ALICE);
        assertEq(minted, 0);
        assertEq(lastMint, 0);
        assertEq(nextMint, block.timestamp);

        // After first mint
        vm.prank(ALICE);
        mockETH.mintMockETH();

        (minted, lastMint, nextMint) = mockETH.getMintStats(ALICE);
        assertEq(minted, MINT_AMOUNT);
        assertEq(lastMint, block.timestamp);
        assertEq(nextMint, block.timestamp + MINT_COOLDOWN);
    }

    function testGetGlobalMockETHStats() public {
        // Initially no MockETH distributed
        (uint256 totalDistributed, uint256 remainingForMints, uint256 currentPrice) = mockETH.getGlobalMockETHStats();
        assertEq(totalDistributed, 0);
        assertEq(remainingForMints, MAX_SUPPLY);
        assertEq(currentPrice, MOCK_ETH_PRICE_USD);

        // After Alice mints
        vm.prank(ALICE);
        mockETH.mintMockETH();

        (totalDistributed, remainingForMints, currentPrice) = mockETH.getGlobalMockETHStats();
        assertEq(totalDistributed, MINT_AMOUNT);
        assertEq(remainingForMints, MAX_SUPPLY - MINT_AMOUNT);
        assertEq(currentPrice, MOCK_ETH_PRICE_USD);
    }

    function testMultipleUsersMint() public {
        // Alice mints
        vm.prank(ALICE);
        mockETH.mintMockETH();

        // Bob mints
        vm.prank(BOB);
        mockETH.mintMockETH();

        // Charlie mints
        vm.prank(CHARLIE);
        mockETH.mintMockETH();

        assertEq(mockETH.balanceOf(ALICE), MINT_AMOUNT);
        assertEq(mockETH.balanceOf(BOB), MINT_AMOUNT);
        assertEq(mockETH.balanceOf(CHARLIE), MINT_AMOUNT);

        (uint256 totalDistributed,,) = mockETH.getGlobalMockETHStats();
        assertEq(totalDistributed, MINT_AMOUNT * 3);
    }

    function testBurnTokens() public {
        uint256 burnAmount = 5 * 10 ** 18;

        // Give Alice some tokens
        vm.prank(owner);
        mockETH.transfer(ALICE, burnAmount);

        uint256 initialTotalSupply = mockETH.totalSupply();
        uint256 aliceInitialBalance = mockETH.balanceOf(ALICE);

        vm.prank(ALICE);
        mockETH.burn(burnAmount);

        assertEq(mockETH.totalSupply(), initialTotalSupply - burnAmount);
        assertEq(mockETH.balanceOf(ALICE), aliceInitialBalance - burnAmount);
    }

    function testEmergencyMint() public {
        uint256 mintAmount = 1000 * 10 ** 18;
        uint256 burnAmount = 2000 * 10 ** 18; // Burn more than we mint to make room

        // First burn some tokens to make room for emergency mint
        vm.prank(owner);
        mockETH.burn(burnAmount);

        uint256 supplyAfterBurn = mockETH.totalSupply();

        vm.prank(owner);
        mockETH.emergencyMint(ALICE, mintAmount);

        assertEq(mockETH.totalSupply(), supplyAfterBurn + mintAmount);
        assertEq(mockETH.balanceOf(ALICE), mintAmount);
    }

    function testEmergencyMintOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        mockETH.emergencyMint(BOB, 1000 * 10 ** 18);
    }

    function testEmergencyMintMaxSupplyCheck() public {
        vm.prank(owner);
        vm.expectRevert(MockETH.MockETH__MaxSupplyExceeded.selector);
        mockETH.emergencyMint(ALICE, 1); // Should exceed MAX_SUPPLY since all tokens are already minted
    }

    function testMintZeroAddress() public {
        vm.prank(address(0));
        vm.expectRevert(MockETH.MockETH__ZeroAddress.selector);
        mockETH.mintMockETH();
    }

    function testMintInsufficientTokens() public {
        // Transfer all tokens away from owner
        vm.prank(owner);
        mockETH.transfer(ALICE, MAX_SUPPLY);

        vm.prank(BOB);
        vm.expectRevert(MockETH.MockETH__InsufficientBalance.selector);
        mockETH.mintMockETH();
    }

    // Price calculation tests
    function testGetCurrentPrice() public view {
        assertEq(mockETH.getCurrentPrice(), MOCK_ETH_PRICE_USD);
    }

    function testCalculateSUSDRequired() public view {
        uint256 mockETHAmount = 1 * 10 ** 18; // 1 MockETH
        uint256 expectedSUSD = 4000 * 10 ** 18; // 4000 SUSD (1 MockETH = 4000 SUSD)

        assertEq(mockETH.calculateSUSDRequired(mockETHAmount), expectedSUSD);
    }

    function testCalculateMockETHReceived() public view {
        uint256 susdAmount = 4000 * 10 ** 18; // 4000 SUSD
        uint256 expectedMockETH = 1 * 10 ** 18; // 1 MockETH (4000 SUSD = 1 MockETH)

        assertEq(mockETH.calculateMockETHReceived(susdAmount), expectedMockETH);
    }

    function testSwapRateCalculations() public view {
        // Test the swap rate: 1 SUSD = 0.00025 MockETH
        uint256 oneSUSD = 1 * 10 ** 18;
        uint256 expectedMockETH = (25 * 10 ** 18) / 100000; // 0.00025 MockETH

        assertEq(mockETH.calculateMockETHReceived(oneSUSD), expectedMockETH);

        // Test reverse: 0.00025 MockETH = 1 SUSD
        uint256 pointZeroZeroZeroTwoFiveMockETH = (25 * 10 ** 18) / 100000;
        uint256 expectedSUSD = 1 * 10 ** 18;

        assertEq(mockETH.calculateSUSDRequired(pointZeroZeroZeroTwoFiveMockETH), expectedSUSD);
    }

    // Fuzzing tests
    function testFuzzTransfer(uint256 amount) public {
        amount = bound(amount, 0, MAX_SUPPLY);

        vm.prank(owner);
        mockETH.transfer(ALICE, amount);

        assertEq(mockETH.balanceOf(ALICE), amount);
        assertEq(mockETH.balanceOf(owner), MAX_SUPPLY - amount);
    }

    function testFuzzBurn(uint256 amount) public {
        amount = bound(amount, 0, 10000 * 10 ** 18);

        // Give Alice tokens to burn
        vm.prank(owner);
        mockETH.transfer(ALICE, amount);

        uint256 initialTotalSupply = mockETH.totalSupply();

        vm.prank(ALICE);
        mockETH.burn(amount);

        assertEq(mockETH.totalSupply(), initialTotalSupply - amount);
        assertEq(mockETH.balanceOf(ALICE), 0);
    }

    function testFuzzCalculateSUSDRequired(uint256 mockETHAmount) public view {
        mockETHAmount = bound(mockETHAmount, 0, MAX_SUPPLY);
        uint256 result = mockETH.calculateSUSDRequired(mockETHAmount);
        assertEq(result, mockETHAmount * 4000);
    }

    function testFuzzCalculateMockETHReceived(uint256 susdAmount) public view {
        susdAmount = bound(susdAmount, 0, type(uint256).max / 25); // Prevent overflow
        uint256 result = mockETH.calculateMockETHReceived(susdAmount);
        assertEq(result, (susdAmount * 25) / 100000);
    }
}
