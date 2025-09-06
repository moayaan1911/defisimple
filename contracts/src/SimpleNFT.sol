// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimpleNFT
 * @dev ERC721 NFT collection with IPFS metadata support and SUSD payment
 * @notice "DeFi Learning Heroes" NFT collection for educational platform
 */
contract SimpleNFT is ERC721URIStorage, Ownable {
    // Constants
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant MINT_PRICE = 10 * 10 ** 18; // 10 SUSD
    uint256 public constant MINT_COOLDOWN = 1 hours; // 1 hour cooldown
    
    // SUSD token contract address (will be set in constructor)
    IERC20 public immutable susdToken;
    
    // State variables
    uint256 public totalSupply;
    bool public mintingActive = true;
    
    // User tracking
    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public mintCount;
    
    // Events
    event NFTMinted(address indexed user, uint256 indexed tokenId, string tokenURI, uint256 timestamp);
    event MintingToggled(bool active);
    event SUSDWithdrawn(address indexed owner, uint256 amount);
    
    // Custom errors
    error SimpleNFT__MintingNotActive();
    error SimpleNFT__MaxSupplyReached();
    error SimpleNFT__MintCooldownActive();
    error SimpleNFT__InsufficientSUSD();
    error SimpleNFT__SUSDTransferFailed();
    error SimpleNFT__EmptyTokenURI();
    error SimpleNFT__ZeroAddress();
    
    constructor(address _susdToken) ERC721("DeFi Learning Heroes", "DLH") Ownable(msg.sender) {
        if (_susdToken == address(0)) revert SimpleNFT__ZeroAddress();
        susdToken = IERC20(_susdToken);
    }
    
    /**
     * @dev Mint NFT with custom IPFS metadata URI
     * @param tokenURI IPFS URI for the NFT metadata
     * @notice Users pay 10 SUSD and must wait 1 hour between mints
     */
    function mintWithURI(string memory tokenURI) external {
        if (!mintingActive) revert SimpleNFT__MintingNotActive();
        if (bytes(tokenURI).length == 0) revert SimpleNFT__EmptyTokenURI();
        if (totalSupply >= MAX_SUPPLY) revert SimpleNFT__MaxSupplyReached();
        
        // Check cooldown (skip for first-time minters)
        if (lastMintTime[msg.sender] != 0 && lastMintTime[msg.sender] + MINT_COOLDOWN > block.timestamp) {
            revert SimpleNFT__MintCooldownActive();
        }
        
        // Check SUSD balance and allowance
        if (susdToken.balanceOf(msg.sender) < MINT_PRICE) {
            revert SimpleNFT__InsufficientSUSD();
        }
        
        if (susdToken.allowance(msg.sender, address(this)) < MINT_PRICE) {
            revert SimpleNFT__InsufficientSUSD();
        }
        
        // Transfer SUSD payment
        bool success = susdToken.transferFrom(msg.sender, address(this), MINT_PRICE);
        if (!success) revert SimpleNFT__SUSDTransferFailed();
        
        // Mint NFT
        uint256 tokenId = totalSupply + 1;
        totalSupply++;
        
        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Update user stats
        lastMintTime[msg.sender] = block.timestamp;
        mintCount[msg.sender]++;
        
        emit NFTMinted(msg.sender, tokenId, tokenURI, block.timestamp);
    }
    
    /**
     * @dev Check if user can mint NFT
     * @param user Address to check
     * @return canMintNow Whether user can mint
     * @return timeLeft Seconds remaining in cooldown (0 if can mint)
     */
    function canMint(address user) external view returns (bool canMintNow, uint256 timeLeft) {
        if (!mintingActive || totalSupply >= MAX_SUPPLY) {
            return (false, 0);
        }
        
        // First-time minters can mint immediately
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
     * @dev Get user's mint statistics
     * @param user Address to check
     * @return minted Total NFTs minted by user
     * @return lastMint Timestamp of last mint
     * @return nextMint Timestamp when user can mint next
     */
    function getMintStats(address user) 
        external 
        view 
        returns (uint256 minted, uint256 lastMint, uint256 nextMint) 
    {
        minted = mintCount[user];
        lastMint = lastMintTime[user];
        
        if (lastMint == 0) {
            nextMint = block.timestamp; // Can mint immediately if never minted
        } else {
            nextMint = lastMint + MINT_COOLDOWN;
        }
    }
    
    /**
     * @dev Get collection statistics
     * @return supply Current total supply
     * @return maxSupply Maximum total supply
     * @return mintPrice Price in SUSD to mint
     * @return active Whether minting is currently active
     */
    function getCollectionStats() 
        external 
        view 
        returns (uint256 supply, uint256 maxSupply, uint256 mintPrice, bool active) 
    {
        return (totalSupply, MAX_SUPPLY, MINT_PRICE, mintingActive);
    }
    
    /**
     * @dev Toggle minting on/off (owner only)
     */
    function toggleMinting() external onlyOwner {
        mintingActive = !mintingActive;
        emit MintingToggled(mintingActive);
    }
    
    /**
     * @dev Withdraw collected SUSD tokens (owner only)
     */
    function withdrawSUSD() external onlyOwner {
        uint256 balance = susdToken.balanceOf(address(this));
        if (balance > 0) {
            bool success = susdToken.transfer(owner(), balance);
            if (!success) revert SimpleNFT__SUSDTransferFailed();
            emit SUSDWithdrawn(owner(), balance);
        }
    }
    
    /**
     * @dev Get contract's SUSD balance
     * @return balance SUSD balance of contract
     */
    function getContractBalance() external view returns (uint256 balance) {
        return susdToken.balanceOf(address(this));
    }
    
    /**
     * @dev Override supportsInterface for ERC721URIStorage
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}