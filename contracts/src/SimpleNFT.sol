// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SimpleNFT - DeFi Learning Heroes Collection
 * @dev ERC721 NFT collection for educational DeFi platform
 * @notice Educational NFT collection featuring DeFi learning characters
 */
contract SimpleNFT is ERC721, ERC721URIStorage, Ownable {
    using Strings for uint256;

    // Collection constants from UI requirements
    uint256 public constant MAX_SUPPLY = 10_000; // Max 10,000 NFTs
    uint256 public constant MINT_PRICE = 0.001 ether; // 0.001 ETH per mint
    uint256 public constant MAX_MINT_PER_TX = 5; // Max 5 per transaction
    uint256 public constant MINT_COOLDOWN = 1 hours; // 1 hour cooldown per address

    // Collection state
    uint256 public totalSupply;
    uint256 public totalMinted;
    bool public mintingActive = true;
    string private _baseTokenURI;

    // Mint tracking for cooldown
    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public totalMintedByUser;

    // Events for UI integration
    event NFTMinted(address indexed minter, uint256 indexed tokenId, string heroType);
    event MintingStatusChanged(bool active);
    event BaseURIUpdated(string newBaseURI);

    // Custom errors for gas efficiency
    error SimpleNFT__MaxSupplyExceeded();
    error SimpleNFT__MintingNotActive();
    error SimpleNFT__InsufficientPayment();
    error SimpleNFT__MaxMintPerTxExceeded();
    error SimpleNFT__MintCooldownActive();
    error SimpleNFT__ZeroQuantity();
    error SimpleNFT__WithdrawFailed();

    // DeFi Learning Heroes types for UI display
    string[] public heroTypes =
        ["Yield Farmer", "Liquidity Provider", "Bridge Guardian", "Staking Sentinel", "NFT Collector", "DeFi Architect"];

    constructor() ERC721("DeFi Learning Heroes", "HERO") Ownable(msg.sender) {
        // Set initial base URI for metadata
        _baseTokenURI = "https://defi-heroes-metadata.vercel.app/";
    }

    /**
     * @dev Mint NFT function (UI Mint Tab functionality)
     * @param quantity Number of NFTs to mint (1-5)
     * @notice Mint educational DeFi hero NFTs with cooldown protection
     */
    function mintHero(uint256 quantity) external payable {
        if (quantity == 0) revert SimpleNFT__ZeroQuantity();
        if (quantity > MAX_MINT_PER_TX) revert SimpleNFT__MaxMintPerTxExceeded();
        if (!mintingActive) revert SimpleNFT__MintingNotActive();
        if (totalSupply + quantity > MAX_SUPPLY) revert SimpleNFT__MaxSupplyExceeded();

        // Check cooldown (skip for first-time minters)
        if (lastMintTime[msg.sender] != 0 && lastMintTime[msg.sender] + MINT_COOLDOWN > block.timestamp) {
            revert SimpleNFT__MintCooldownActive();
        }

        // Check payment
        uint256 totalPrice = MINT_PRICE * quantity;
        if (msg.value < totalPrice) revert SimpleNFT__InsufficientPayment();

        // Update tracking
        lastMintTime[msg.sender] = block.timestamp;
        totalMintedByUser[msg.sender] += quantity;

        // Mint NFTs
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            totalSupply++;
            totalMinted++;

            _mint(msg.sender, tokenId);

            // Assign hero type based on tokenId
            string memory heroType = heroTypes[tokenId % heroTypes.length];

            emit NFTMinted(msg.sender, tokenId, heroType);
        }

        // Refund excess ETH
        if (msg.value > totalPrice) {
            payable(msg.sender).transfer(msg.value - totalPrice);
        }
    }

    /**
     * @dev Free mint for airdrops and promotional purposes (owner only)
     * @param to Address to mint to
     * @param quantity Number of NFTs to mint
     */
    function freeMint(address to, uint256 quantity) external onlyOwner {
        if (quantity == 0) revert SimpleNFT__ZeroQuantity();
        if (totalSupply + quantity > MAX_SUPPLY) revert SimpleNFT__MaxSupplyExceeded();

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply + 1;
            totalSupply++;
            totalMinted++;

            _mint(to, tokenId);

            string memory heroType = heroTypes[tokenId % heroTypes.length];
            emit NFTMinted(to, tokenId, heroType);
        }
    }

    /**
     * @dev Check if user can mint (UI helper function)
     * @param user Address to check
     * @return canMint Whether user can mint
     * @return timeLeft Seconds remaining in cooldown (0 if can mint)
     */
    function canMint(address user) external view returns (bool canMint, uint256 timeLeft) {
        if (!mintingActive) return (false, type(uint256).max);
        if (totalSupply >= MAX_SUPPLY) return (false, type(uint256).max);

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
     * @dev Get user's minting statistics (UI display function)
     * @param user Address to check
     * @return minted Total NFTs minted by user
     * @return lastMint Timestamp of last mint
     * @return nextMint Timestamp when user can mint next
     */
    function getMintStats(address user) external view returns (uint256 minted, uint256 lastMint, uint256 nextMint) {
        minted = totalMintedByUser[user];
        lastMint = lastMintTime[user];

        if (lastMint == 0) {
            nextMint = block.timestamp; // Can mint immediately if never minted
        } else {
            nextMint = lastMint + MINT_COOLDOWN;
        }
    }

    /**
     * @dev Get collection statistics (UI analytics)
     * @return supply Total minted NFTs
     * @return maxSupply Maximum possible NFTs
     * @return mintPrice Price per NFT in Wei
     * @return isActive Whether minting is active
     */
    function getCollectionStats()
        external
        view
        returns (uint256 supply, uint256 maxSupply, uint256 mintPrice, bool isActive)
    {
        supply = totalSupply;
        maxSupply = MAX_SUPPLY;
        mintPrice = MINT_PRICE;
        isActive = mintingActive;
    }

    /**
     * @dev Get hero type for a specific token ID (UI display function)
     * @param tokenId Token ID to check
     * @return heroType The hero type name
     */
    function getHeroType(uint256 tokenId) external view returns (string memory heroType) {
        if (!_exists(tokenId)) return "Unknown";
        return heroTypes[tokenId % heroTypes.length];
    }

    /**
     * @dev Toggle minting status (owner only)
     */
    function toggleMinting() external onlyOwner {
        mintingActive = !mintingActive;
        emit MintingStatusChanged(mintingActive);
    }

    /**
     * @dev Set base URI for metadata (owner only)
     * @param baseURI New base URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success,) = payable(owner()).call{value: balance}("");
        if (!success) revert SimpleNFT__WithdrawFailed();
    }

    /**
     * @dev Override tokenURI to use base URI + token ID
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (!_exists(tokenId)) return "";

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : "";
    }

    /**
     * @dev Override _baseURI to return stored base URI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Check if token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Override supportsInterface for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Override _update for tracking (required by OpenZeppelin v5)
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }
}
