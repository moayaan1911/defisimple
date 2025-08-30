// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {DeploySimpleNFT} from "script/SimpleNFT.s.sol";
import {SimpleNFT} from "src/SimpleNFT.sol";

contract SimpleNFTTest is Test {
    SimpleNFT public simpleNFT;
    address public owner;

    // Test users
    address public ALICE = makeAddr("alice");
    address public BOB = makeAddr("bob");
    address public CHARLIE = makeAddr("charlie");

    // Constants from contract
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MINT_PRICE = 0.001 ether;
    uint256 public constant MAX_MINT_PER_TX = 5;
    uint256 public constant MINT_COOLDOWN = 1 hours;

    function setUp() public {
        DeploySimpleNFT deployer = new DeploySimpleNFT();
        simpleNFT = deployer.run();
        owner = simpleNFT.owner();

        // Fund test users with ETH
        vm.deal(ALICE, 10 ether);
        vm.deal(BOB, 10 ether);
        vm.deal(CHARLIE, 10 ether);
    }

    // Basic ERC721 functionality tests
    function testTokenMetadata() public view {
        assertEq(simpleNFT.name(), "DeFi Learning Heroes");
        assertEq(simpleNFT.symbol(), "HERO");
    }

    function testInitialState() public view {
        assertEq(simpleNFT.totalSupply(), 0);
        assertEq(simpleNFT.totalMinted(), 0);
        assertTrue(simpleNFT.mintingActive());
    }

    function testHeroTypes() public view {
        assertEq(simpleNFT.heroTypes(0), "Yield Farmer");
        assertEq(simpleNFT.heroTypes(1), "Liquidity Provider");
        assertEq(simpleNFT.heroTypes(2), "Bridge Guardian");
        assertEq(simpleNFT.heroTypes(3), "Staking Sentinel");
        assertEq(simpleNFT.heroTypes(4), "NFT Collector");
        assertEq(simpleNFT.heroTypes(5), "DeFi Architect");
    }

    // Minting functionality tests
    function testMintHero() public {
        uint256 quantity = 1;
        uint256 cost = MINT_PRICE * quantity;

        vm.prank(ALICE);
        simpleNFT.mintHero{value: cost}(quantity);

        assertEq(simpleNFT.totalSupply(), quantity);
        assertEq(simpleNFT.totalMinted(), quantity);
        assertEq(simpleNFT.balanceOf(ALICE), quantity);
        assertEq(simpleNFT.ownerOf(1), ALICE);
        assertEq(simpleNFT.totalMintedByUser(ALICE), quantity);
        assertTrue(simpleNFT.lastMintTime(ALICE) > 0);
    }

    function testMintMultipleHeroes() public {
        uint256 quantity = 3;
        uint256 cost = MINT_PRICE * quantity;

        vm.prank(ALICE);
        simpleNFT.mintHero{value: cost}(quantity);

        assertEq(simpleNFT.totalSupply(), quantity);
        assertEq(simpleNFT.balanceOf(ALICE), quantity);
        assertEq(simpleNFT.totalMintedByUser(ALICE), quantity);

        // Check that all tokens are owned by Alice
        for (uint256 i = 1; i <= quantity; i++) {
            assertEq(simpleNFT.ownerOf(i), ALICE);
        }
    }

    function testMintHeroEvent() public {
        vm.expectEmit(true, true, false, true);
        emit SimpleNFT.NFTMinted(ALICE, 1, "Liquidity Provider"); // tokenId 1 % 6 = 1

        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);
    }

    function testMintRefundsExcessETH() public {
        uint256 overpayment = MINT_PRICE + 0.5 ether;
        uint256 aliceBalanceBefore = ALICE.balance;

        vm.prank(ALICE);
        simpleNFT.mintHero{value: overpayment}(1);

        uint256 aliceBalanceAfter = ALICE.balance;
        assertEq(aliceBalanceAfter, aliceBalanceBefore - MINT_PRICE);
    }

    function testMintCooldown() public {
        // Alice mints first NFT
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        // Try to mint again immediately - should fail
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MintCooldownActive.selector);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        // Fast forward 1 hour
        vm.warp(block.timestamp + MINT_COOLDOWN);

        // Should be able to mint again
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        assertEq(simpleNFT.totalMintedByUser(ALICE), 2);
    }

    function testCanMintHelper() public {
        // Initially should be able to mint
        (bool canMint, uint256 timeLeft) = simpleNFT.canMint(ALICE);
        assertTrue(canMint);
        assertEq(timeLeft, 0);

        // After minting, should not be able to mint
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        (canMint, timeLeft) = simpleNFT.canMint(ALICE);
        assertFalse(canMint);
        assertTrue(timeLeft > 0);

        // After cooldown, should be able to mint again
        vm.warp(block.timestamp + MINT_COOLDOWN);
        (canMint, timeLeft) = simpleNFT.canMint(ALICE);
        assertTrue(canMint);
        assertEq(timeLeft, 0);
    }

    function testGetMintStats() public {
        // Before any mints
        (uint256 minted, uint256 lastMint, uint256 nextMint) = simpleNFT.getMintStats(ALICE);
        assertEq(minted, 0);
        assertEq(lastMint, 0);
        assertEq(nextMint, block.timestamp);

        // After first mint
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        (minted, lastMint, nextMint) = simpleNFT.getMintStats(ALICE);
        assertEq(minted, 1);
        assertEq(lastMint, block.timestamp);
        assertEq(nextMint, block.timestamp + MINT_COOLDOWN);
    }

    function testGetCollectionStats() public {
        (uint256 supply, uint256 maxSupply, uint256 mintPrice, bool isActive) = simpleNFT.getCollectionStats();
        assertEq(supply, 0);
        assertEq(maxSupply, MAX_SUPPLY);
        assertEq(mintPrice, MINT_PRICE);
        assertTrue(isActive);

        // After minting
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        (supply,,,) = simpleNFT.getCollectionStats();
        assertEq(supply, 1);
    }

    function testGetHeroType() public {
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE * 2}(2);

        assertEq(simpleNFT.getHeroType(1), "Liquidity Provider"); // 1 % 6 = 1
        assertEq(simpleNFT.getHeroType(2), "Bridge Guardian"); // 2 % 6 = 2
    }

    function testGetHeroTypeNonExistentToken() public view {
        assertEq(simpleNFT.getHeroType(999), "Unknown");
    }

    // Edge case and error condition tests
    function testMintZeroQuantity() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__ZeroQuantity.selector);
        simpleNFT.mintHero{value: 0}(0);
    }

    function testMintExceedsMaxPerTx() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MaxMintPerTxExceeded.selector);
        simpleNFT.mintHero{value: MINT_PRICE * 6}(6);
    }

    function testMintInsufficientPayment() public {
        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__InsufficientPayment.selector);
        simpleNFT.mintHero{value: MINT_PRICE - 1}(1);
    }

    function testMintWhenInactive() public {
        vm.prank(owner);
        simpleNFT.toggleMinting();

        vm.prank(ALICE);
        vm.expectRevert(SimpleNFT.SimpleNFT__MintingNotActive.selector);
        simpleNFT.mintHero{value: MINT_PRICE}(1);
    }

    function testCanMintWhenInactive() public {
        vm.prank(owner);
        simpleNFT.toggleMinting();

        (bool canMint, uint256 timeLeft) = simpleNFT.canMint(ALICE);
        assertFalse(canMint);
        assertEq(timeLeft, type(uint256).max);
    }

    // Owner functions tests
    function testFreeMint() public {
        uint256 quantity = 3;

        vm.prank(owner);
        simpleNFT.freeMint(ALICE, quantity);

        assertEq(simpleNFT.totalSupply(), quantity);
        assertEq(simpleNFT.balanceOf(ALICE), quantity);
        assertEq(simpleNFT.totalMintedByUser(ALICE), 0); // Free mints don't count towards user stats
    }

    function testFreeMintOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.freeMint(BOB, 1);
    }

    function testToggleMinting() public {
        assertTrue(simpleNFT.mintingActive());

        vm.expectEmit(false, false, false, true);
        emit SimpleNFT.MintingStatusChanged(false);

        vm.prank(owner);
        simpleNFT.toggleMinting();

        assertFalse(simpleNFT.mintingActive());

        // Toggle back
        vm.prank(owner);
        simpleNFT.toggleMinting();

        assertTrue(simpleNFT.mintingActive());
    }

    function testToggleMintingOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.toggleMinting();
    }

    function testSetBaseURI() public {
        string memory newBaseURI = "https://new-metadata.vercel.app/";

        vm.expectEmit(false, false, false, true);
        emit SimpleNFT.BaseURIUpdated(newBaseURI);

        vm.prank(owner);
        simpleNFT.setBaseURI(newBaseURI);

        // Mint an NFT to test URI
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        string memory expectedURI = string(abi.encodePacked(newBaseURI, "1.json"));
        assertEq(simpleNFT.tokenURI(1), expectedURI);
    }

    function testSetBaseURIOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.setBaseURI("https://hacker.com/");
    }

    function testWithdraw() public {
        // Alice mints some NFTs
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE * 3}(3);

        uint256 contractBalance = address(simpleNFT).balance;
        uint256 ownerBalanceBefore = owner.balance;

        vm.prank(owner);
        simpleNFT.withdraw();

        assertEq(address(simpleNFT).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + contractBalance);
    }

    function testWithdrawOnlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert();
        simpleNFT.withdraw();
    }

    function testTokenURIForNonExistentToken() public view {
        assertEq(simpleNFT.tokenURI(999), "");
    }

    function testTokenURIFormat() public {
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        string memory expectedURI = "https://defi-heroes-metadata.vercel.app/1.json";
        assertEq(simpleNFT.tokenURI(1), expectedURI);
    }

    function testMaxSupplyProtection() public {
        // This test would be too expensive to run fully, so we'll test the logic
        vm.prank(owner);
        vm.expectRevert(SimpleNFT.SimpleNFT__MaxSupplyExceeded.selector);
        simpleNFT.freeMint(ALICE, MAX_SUPPLY + 1);
    }

    function testMultipleUsersCanMint() public {
        // Alice mints
        vm.prank(ALICE);
        simpleNFT.mintHero{value: MINT_PRICE}(1);

        // Bob mints (no cooldown since he hasn't minted before)
        vm.prank(BOB);
        simpleNFT.mintHero{value: MINT_PRICE * 2}(2);

        // Charlie mints
        vm.prank(CHARLIE);
        simpleNFT.mintHero{value: MINT_PRICE * 3}(3);

        assertEq(simpleNFT.balanceOf(ALICE), 1);
        assertEq(simpleNFT.balanceOf(BOB), 2);
        assertEq(simpleNFT.balanceOf(CHARLIE), 3);
        assertEq(simpleNFT.totalSupply(), 6);
    }

    // Fuzzing tests
    function testFuzzMintQuantity(uint8 quantity) public {
        quantity = uint8(bound(quantity, 1, MAX_MINT_PER_TX));
        uint256 cost = MINT_PRICE * quantity;

        vm.deal(ALICE, cost);
        vm.prank(ALICE);
        simpleNFT.mintHero{value: cost}(quantity);

        assertEq(simpleNFT.balanceOf(ALICE), quantity);
        assertEq(simpleNFT.totalSupply(), quantity);
    }

    function testFuzzFreeMintQuantity(uint16 quantity) public {
        quantity = uint16(bound(quantity, 1, 100)); // Reasonable upper bound

        vm.prank(owner);
        simpleNFT.freeMint(ALICE, quantity);

        assertEq(simpleNFT.balanceOf(ALICE), quantity);
        assertEq(simpleNFT.totalSupply(), quantity);
    }

    function testSupportsInterface() public view {
        // ERC721
        assertTrue(simpleNFT.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(simpleNFT.supportsInterface(0x5b5e139f));
        // ERC165
        assertTrue(simpleNFT.supportsInterface(0x01ffc9a7));
    }
}
