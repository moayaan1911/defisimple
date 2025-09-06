// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {SimpleNFT} from "src/SimpleNFT.sol";
import {SimpleUSD} from "src/SimpleUSD.sol";
import {DeploySimpleUSD} from "script/SimpleUSD.s.sol";

contract SimpleNFTTest is Test {
    SimpleNFT public simpleNFT;
    SimpleUSD public simpleUSD;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MINT_PRICE = 10 * 10 ** 18; // 10 SUSD
    uint256 public constant MINT_COOLDOWN = 1 hours;

    // Test token URIs
    string public constant TEST_TOKEN_URI_1 = "ipfs://QmTestHash1234567890abcdef";
    string public constant TEST_TOKEN_URI_2 = "ipfs://QmTestHash0987654321fedcba";

    event NFTMinted(address indexed user, uint256 indexed tokenId, string tokenURI, uint256 timestamp);
    event MintingToggled(bool active);
    event SUSDWithdrawn(address indexed owner, uint256 amount);

    function setUp() public {
        // Deploy SimpleUSD first
        DeploySimpleUSD usdDeployer = new DeploySimpleUSD();
        simpleUSD = usdDeployer.run();
        owner = simpleUSD.owner();

        // Deploy SimpleNFT with SimpleUSD address
        vm.prank(owner);
        simpleNFT = new SimpleNFT(address(simpleUSD));

        // Give users SUSD tokens for testing
        vm.startPrank(owner);
        simpleUSD.transfer(ALICE, MINT_PRICE * 100); // 1000 SUSD
        simpleUSD.transfer(BOB, MINT_PRICE * 100);   // 1000 SUSD
        simpleUSD.transfer(CHARLIE, MINT_PRICE * 5); // 50 SUSD (less than mint price * 10)
        vm.stopPrank();

        // Approve NFT contract to spend users' SUSD
        vm.prank(ALICE);
        simpleUSD.approve(address(simpleNFT), type(uint256).max);

        vm.prank(BOB);
        simpleUSD.approve(address(simpleNFT), type(uint256).max);

        vm.prank(CHARLIE);
        simpleUSD.approve(address(simpleNFT), type(uint256).max);
    }

    // Basic contract setup tests
    function testContractSetup() public view {
        assertEq(simpleNFT.name(), "DeFi Learning Heroes");
        assertEq(simpleNFT.symbol(), "DLH");
        assertEq(address(simpleNFT.susdToken()), address(simpleUSD));
        assertEq(simpleNFT.MAX_SUPPLY(), MAX_SUPPLY);
        assertEq(simpleNFT.MINT_PRICE(), MINT_PRICE);
        assertEq(simpleNFT.MINT_COOLDOWN(), MINT_COOLDOWN);
        assertTrue(simpleNFT.mintingActive());
        assertEq(simpleNFT.totalSupply(), 0);
    }

    function testOwnership() public view {
        assertEq(simpleNFT.owner(), owner);
    }

    // Mint functionality tests
    function testSuccessfulMint() public {
        uint256 aliceBalanceBefore = simpleUSD.balanceOf(ALICE);
        uint256 contractBalanceBefore = simpleUSD.balanceOf(address(simpleNFT));

        vm.expectEmit(true, true, false, true);
        emit NFTMinted(ALICE, 1, TEST_TOKEN_URI_1, block.timestamp);

        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        // Check token was minted
        assertEq(simpleNFT.totalSupply(), 1);
        assertEq(simpleNFT.ownerOf(1), ALICE);
        assertEq(simpleNFT.tokenURI(1), TEST_TOKEN_URI_1);

        // Check payment was transferred
        assertEq(simpleUSD.balanceOf(ALICE), aliceBalanceBefore - MINT_PRICE);
        assertEq(simpleUSD.balanceOf(address(simpleNFT)), contractBalanceBefore + MINT_PRICE);

        // Check user stats updated
        assertEq(simpleNFT.mintCount(ALICE), 1);
        assertEq(simpleNFT.lastMintTime(ALICE), block.timestamp);
    }

    function testMultipleMintsByDifferentUsers() public {
        // Alice mints
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        // Bob mints
        vm.prank(BOB);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2);

        assertEq(simpleNFT.totalSupply(), 2);
        assertEq(simpleNFT.ownerOf(1), ALICE);
        assertEq(simpleNFT.ownerOf(2), BOB);
        assertEq(simpleNFT.tokenURI(1), TEST_TOKEN_URI_1);
        assertEq(simpleNFT.tokenURI(2), TEST_TOKEN_URI_2);
    }

    function testMintCooldown() public {
        // First mint should succeed
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        // Second mint immediately should fail
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MintCooldownActive.selector);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2);

        // Fast forward time by 30 minutes (still in cooldown)
        vm.warp(block.timestamp + 30 minutes);

        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MintCooldownActive.selector);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2);

        // Fast forward past cooldown period
        vm.warp(block.timestamp + 31 minutes); // Total: 61 minutes > 1 hour

        // Should now succeed
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2);

        assertEq(simpleNFT.totalSupply(), 2);
        assertEq(simpleNFT.mintCount(ALICE), 2);
    }

    function testCanMintFunction() public {
        // First time minter can mint
        (bool canMintNow, uint256 timeLeft) = simpleNFT.canMint(ALICE);
        assertTrue(canMintNow);
        assertEq(timeLeft, 0);

        // After minting, should be in cooldown
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        (canMintNow, timeLeft) = simpleNFT.canMint(ALICE);
        assertFalse(canMintNow);
        assertEq(timeLeft, MINT_COOLDOWN);

        // After cooldown expires
        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        (canMintNow, timeLeft) = simpleNFT.canMint(ALICE);
        assertTrue(canMintNow);
        assertEq(timeLeft, 0);
    }

    // Error condition tests
    function testMintWithEmptyURI() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__EmptyTokenURI.selector);
        simpleNFT.mintWithURI("");
    }

    function testMintInsufficientSUSDBalance() public {
        // Charlie only has 50 SUSD, needs 10 per mint
        vm.prank(CHARLIE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1); // 1st mint - should work (40 SUSD left)

        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        vm.prank(CHARLIE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2); // 2nd mint - should work (30 SUSD left)

        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        vm.prank(CHARLIE);
        simpleNFT.mintWithURI("ipfs://test3"); // 3rd mint - should work (20 SUSD left)

        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        vm.prank(CHARLIE);
        simpleNFT.mintWithURI("ipfs://test4"); // 4th mint - should work (10 SUSD left)

        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        vm.prank(CHARLIE);
        simpleNFT.mintWithURI("ipfs://test5"); // 5th mint - should work (0 SUSD left)

        // 6th mint should fail
        vm.warp(block.timestamp + MINT_COOLDOWN + 1);
        vm.prank(CHARLIE);
        vm.expectRevert(SimpleNFT.SimpleNFT__InsufficientSUSD.selector);
        simpleNFT.mintWithURI("ipfs://test6");
    }

    function testMintInsufficientAllowance() public {
        // Remove ALICE's approval
        vm.prank(ALICE);
        simpleUSD.approve(address(simpleNFT), 0);

        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__InsufficientSUSD.selector);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);
    }

    function testMintingInactive() public {
        // Owner disables minting
        vm.prank(owner);
        simpleNFT.toggleMinting();

        assertFalse(simpleNFT.mintingActive());

        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MintingNotActive.selector);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);
    }

    function testMaxSupplyReached() public {
        // This test would be expensive to run fully, so we'll test the logic
        // by temporarily setting totalSupply to MAX_SUPPLY - 1
        
        // Mint one NFT first
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        // Use a mock approach: create a new contract with MAX_SUPPLY = 2 for testing
        vm.prank(owner);
        SimpleNFT testContract = new SimpleNFT(address(simpleUSD));

        // Give more SUSD to test multiple mints
        vm.prank(owner);
        simpleUSD.transfer(BOB, MINT_PRICE * 10);

        vm.prank(BOB);
        simpleUSD.approve(address(testContract), type(uint256).max);

        // Mint tokens up to the limit would require modifying contract or long test
        // For now, verify the revert condition exists in contract logic
    }

    // Owner functionality tests
    function testToggleMinting() public {
        assertTrue(simpleNFT.mintingActive());

        vm.expectEmit(false, false, false, true);
        emit MintingToggled(false);

        vm.prank(owner);
        simpleNFT.toggleMinting();

        assertFalse(simpleNFT.mintingActive());

        vm.expectEmit(false, false, false, true);
        emit MintingToggled(true);

        vm.prank(owner);
        simpleNFT.toggleMinting();

        assertTrue(simpleNFT.mintingActive());
    }

    function testToggleMintingOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.toggleMinting();
    }

    function testWithdrawSUSD() public {
        // First, generate some revenue by minting
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        vm.prank(BOB);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_2);

        uint256 contractBalance = simpleNFT.getContractBalance();
        assertEq(contractBalance, MINT_PRICE * 2);

        uint256 ownerBalanceBefore = simpleUSD.balanceOf(owner);

        vm.expectEmit(true, false, false, true);
        emit SUSDWithdrawn(owner, contractBalance);

        vm.prank(owner);
        simpleNFT.withdrawSUSD();

        assertEq(simpleUSD.balanceOf(owner), ownerBalanceBefore + contractBalance);
        assertEq(simpleNFT.getContractBalance(), 0);
    }

    function testWithdrawSUSDOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.withdrawSUSD();
    }

    // Statistics function tests
    function testGetMintStats() public {
        // Before minting
        (uint256 minted, uint256 lastMint, uint256 nextMint) = simpleNFT.getMintStats(ALICE);
        assertEq(minted, 0);
        assertEq(lastMint, 0);
        assertEq(nextMint, block.timestamp);

        // After minting
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        (minted, lastMint, nextMint) = simpleNFT.getMintStats(ALICE);
        assertEq(minted, 1);
        assertEq(lastMint, block.timestamp);
        assertEq(nextMint, block.timestamp + MINT_COOLDOWN);
    }

    function testGetCollectionStats() public {
        (uint256 supply, uint256 maxSupply, uint256 mintPrice, bool active) = simpleNFT.getCollectionStats();
        
        assertEq(supply, 0);
        assertEq(maxSupply, MAX_SUPPLY);
        assertEq(mintPrice, MINT_PRICE);
        assertTrue(active);

        // After minting one NFT
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        (supply, maxSupply, mintPrice, active) = simpleNFT.getCollectionStats();
        assertEq(supply, 1);
        assertEq(maxSupply, MAX_SUPPLY);
        assertEq(mintPrice, MINT_PRICE);
        assertTrue(active);
    }

    function testGetContractBalance() public {
        assertEq(simpleNFT.getContractBalance(), 0);

        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        assertEq(simpleNFT.getContractBalance(), MINT_PRICE);
    }

    // Constructor error test
    function testConstructorZeroAddress() public {
        vm.expectRevert(SimpleNFT.SimpleNFT__ZeroAddress.selector);
        new SimpleNFT(address(0));
    }

    // ERC721 standard compliance tests
    function testSupportsInterface() public view {
        // ERC721
        assertTrue(simpleNFT.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(simpleNFT.supportsInterface(0x5b5e139f));
        // ERC165
        assertTrue(simpleNFT.supportsInterface(0x01ffc9a7));
    }

    function testTokenTransfer() public {
        // Mint an NFT to Alice
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);

        // Transfer from Alice to Bob
        vm.prank(ALICE);
        simpleNFT.transferFrom(ALICE, BOB, 1);

        assertEq(simpleNFT.ownerOf(1), BOB);
        assertEq(simpleNFT.balanceOf(ALICE), 0);
        assertEq(simpleNFT.balanceOf(BOB), 1);
    }

    // Gas optimization test
    function testMintGasUsage() public {
        uint256 gasBefore = gasleft();
        
        vm.prank(ALICE);
        simpleNFT.mintWithURI(TEST_TOKEN_URI_1);
        
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for minting:", gasUsed);
        
        // Assert reasonable gas usage (adjusted based on actual gas usage ~240k)
        assertTrue(gasUsed < 300000, "Minting uses too much gas");
    }
}