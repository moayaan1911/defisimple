"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  FiGift,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiImage,
} from "react-icons/fi";
import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";
import AiBot from "@/components/AiBot";
import { useActiveAccount } from "thirdweb/react";
import { readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { upload, download } from "thirdweb/storage";
import { client } from "@/lib/client";
import { simpleUSDContract, simpleSwapContract, mockETHContract, simpleStakeContract, simpleLendContract, simpleNFTContract, formatTokenAmount, parseTokenAmount, CONTRACT_ADDRESSES } from "@/lib/contracts";

interface UserAchievements {
  firstClaim: boolean;
  dailyClaimer: number; // consecutive days
  defiExplorer: number; // tabs used (max 6)
  lastClaimDate: string;
  nextClaimTime: number; // timestamp
}

// TypeScript declaration for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { 
        method: string; 
        params?: {
          type: string;
          options: {
            address: string;
            symbol: string;
            decimals: number;
            image: string;
          };
        };
      }) => Promise<unknown>;
    };
  }
}

export default function SimplePage() {
  const account = useActiveAccount();
  const isWalletConnected = !!account;
  const [activeTab, setActiveTab] = useState("claim");
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [currentEducationContent, setCurrentEducationContent] =
    useState("airdrop");
  const [claimed, setClaimed] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [achievements, setAchievements] = useState<UserAchievements>({
    firstClaim: false,
    dailyClaimer: 0,
    defiExplorer: 0,
    lastClaimDate: "",
    nextClaimTime: 0,
  });
  const [canClaim, setCanClaim] = useState(true);
  const [susdBalance, setSusdBalance] = useState("0");
  const [isClaimLoading, setIsClaimLoading] = useState(false);

  // Swap state
  const [swapFromAmount, setSwapFromAmount] = useState("");
  const [swapToAmount, setSwapToAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"SUSD_TO_ETH" | "ETH_TO_SUSD">("SUSD_TO_ETH");
  const [isSwapLoading, setIsSwapLoading] = useState(false);
  const [mockEthBalance, setMockEthBalance] = useState("0");
  const [swapHistory, setSwapHistory] = useState<Array<[string, string, string, bigint, bigint, bigint, bigint]>>([]);

  // Stake state
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakedBalance, setStakedBalance] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState(0);
  const [isStakeLoading, setIsStakeLoading] = useState(false);
  const [isUnstakeLoading, setIsUnstakeLoading] = useState(false);
  const [poolStats, setPoolStats] = useState({
    totalStaked: 0,
    totalStakers: 0,
    apy: 12,
    availableRewards: 0
  });

  // Lend state
  const [lendAmount, setLendAmount] = useState("");
  const [lentBalance, setLentBalance] = useState(0);
  const [lendingEarned, setLendingEarned] = useState(0);
  const [isLendLoading, setIsLendLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [lendingStats, setLendingStats] = useState({
    totalLent: 0,
    totalLenders: 0,
    apy: 8,
    availableInterest: 0,
    utilizationRate: 0
  });

  // NFT Mint state
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [mintStats, setMintStats] = useState({
    userMintCount: 0,
    lastMintTime: 0,
    nextMintTime: 0,
    canMint: true,
    timeLeft: 0
  });
  const [collectionStats, setCollectionStats] = useState({
    totalSupply: 0,
    maxSupply: 10000,
    mintPrice: 10,
    mintingActive: true
  });
  const [userNFTs, setUserNFTs] = useState<Array<{
    tokenId: number;
    name: string;
    description: string;
    image: string;
  }>>([]);


  const tabs = [
    { id: "claim", name: "Claim", icon: FiGift, active: true },
    { id: "swap", name: "Swap", icon: FiRefreshCw, active: true },
    { id: "stake", name: "Stake", icon: FiTrendingUp, active: true },
    { id: "lend", name: "Lend", icon: FiDollarSign, active: true },
    { id: "mint", name: "Mint", icon: FiImage, active: true },
  ];

  // Countdown timer function
  const updateCountdown = (nextClaimTime: number) => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeDiff = nextClaimTime - now;

      if (timeDiff <= 0) {
        setCanClaim(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return interval;
  };

  // Initialize localStorage data and countdown timer
  useEffect(() => {
    const initializeUserData = () => {
      const savedAchievements = localStorage.getItem("defiSimple_achievements");
      if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);
        setAchievements(parsed);

        // Check if user can claim
        const now = Date.now();
        if (parsed.nextClaimTime > now) {
          setCanClaim(false);
          updateCountdown(parsed.nextClaimTime);
        } else {
          setCanClaim(true);
          setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        }
      } else {
        // First time user
        const initialData: UserAchievements = {
          firstClaim: false,
          dailyClaimer: 0,
          defiExplorer: 0,
          lastClaimDate: "",
          nextClaimTime: 0,
        };
        setAchievements(initialData);
        localStorage.setItem(
          "defiSimple_achievements",
          JSON.stringify(initialData)
        );
      }
    };

    initializeUserData();
  }, []);

  // Fetch contract data when wallet connected
  useEffect(() => {
    const fetchContractData = async () => {
      if (!account?.address) return;
      
      try {
        // Check SUSD balance
        const balance = await readContract({
          contract: simpleUSDContract,
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address],
        });
        setSusdBalance(formatTokenAmount(balance as bigint));

        // Check airdrop eligibility
        const result = await readContract({
          contract: simpleUSDContract,
          method: "function canClaimAirdrop(address) view returns (bool, uint256)",
          params: [account.address],
        });
        const [canClaimContract, timeLeft] = result as [boolean, bigint];
        
        setCanClaim(canClaimContract);
        
        // If can't claim, set up countdown
        if (!canClaimContract && timeLeft > 0) {
          const nextClaimTime = Date.now() + Number(timeLeft) * 1000;
          updateCountdown(nextClaimTime);
        }
      } catch (error) {
        console.error("Error fetching contract data:", error);
      }
    };

    fetchContractData();
  }, [account?.address]);

  // Track tab usage for DeFi Explorer achievement
  useEffect(() => {
    const updateTabUsage = () => {
      const savedAchievements = localStorage.getItem("defiSimple_achievements");
      if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);
        const tabsUsed = new Set(
          JSON.parse(localStorage.getItem("defiSimple_tabsUsed") || "[]")
        );
        tabsUsed.add(activeTab);

        const updatedAchievements = {
          ...parsed,
          defiExplorer: tabsUsed.size,
        };

        setAchievements(updatedAchievements);
        localStorage.setItem(
          "defiSimple_achievements",
          JSON.stringify(updatedAchievements)
        );
        localStorage.setItem(
          "defiSimple_tabsUsed",
          JSON.stringify([...tabsUsed])
        );
      }
    };

    updateTabUsage();
  }, [activeTab]);


  const showTransactionSuccess = (txHash: string) => {
    setTransactionHash(txHash);
    setShowTransactionModal(true);
  };

  // Load balances and swap history
  const loadBalances = useCallback(async () => {
    if (!account) return;
    
    try {
      // Load SUSD balance
      const susdBal = await readContract({
        contract: simpleUSDContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });
      setSusdBalance(formatTokenAmount(susdBal as bigint));

      // Load MockETH balance
      const mockEthBal = await readContract({
        contract: mockETHContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      });
      setMockEthBalance(formatTokenAmount(mockEthBal as bigint));
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  }, [account]);

  // IPFS helper function - only ipfs.io gateway
  const resolveIPFS = useCallback((ipfsUrl: string): string => {
    const hash = ipfsUrl.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }, []);

  // Fetch from IPFS using Thirdweb V5 download API with ipfs.io fallback
  const fetchFromIPFS = useCallback(async (ipfsUrl: string): Promise<unknown> => {
    try {
      console.log("🎨 Downloading from IPFS using Thirdweb:", ipfsUrl);
      
      // First try with official Thirdweb download API
      const response = await download({
        client,
        uri: ipfsUrl,
      });
      
      console.log("✅ Thirdweb download response:", response);
      
      // Convert response to JSON
      const data = await response.json();
      console.log("✅ Success with Thirdweb download API:", data);
      return data;
      
    } catch (thirdwebError) {
      console.log("❌ Thirdweb download failed:", thirdwebError);
      
      // Fallback to ipfs.io gateway only
      const gateway = resolveIPFS(ipfsUrl);
      
      try {
        console.log("🎨 Trying ipfs.io gateway:", gateway);
        const response = await fetch(gateway, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Success with ipfs.io gateway:", gateway);
          return data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.log("❌ Failed ipfs.io gateway:", gateway, error);
        throw new Error(`Failed to fetch from both Thirdweb and ipfs.io for: ${ipfsUrl}`);
      }
    }
  }, [resolveIPFS]);

  // Load NFT data
  const loadNFTData = useCallback(async () => {
    if (!account) return;
    
    console.log("🎨 Loading NFT data for account:", account.address);
    
    try {
      // Load collection stats
      const [supply, maxSupply, mintPrice, active] = await readContract({
        contract: simpleNFTContract,
        method: "function getCollectionStats() view returns (uint256, uint256, uint256, bool)",
        params: [],
      }) as [bigint, bigint, bigint, boolean];

      setCollectionStats({
        totalSupply: Number(supply),
        maxSupply: Number(maxSupply),
        mintPrice: Number(formatTokenAmount(mintPrice)),
        mintingActive: active
      });

      // Load user mint stats
      const [minted, lastMint, nextMint] = await readContract({
        contract: simpleNFTContract,
        method: "function getMintStats(address) view returns (uint256, uint256, uint256)",
        params: [account.address],
      }) as [bigint, bigint, bigint];

      // Check if user can mint
      const [canMintNow, timeLeft] = await readContract({
        contract: simpleNFTContract,
        method: "function canMint(address) view returns (bool, uint256)",
        params: [account.address],
      }) as [boolean, bigint];

      setMintStats({
        userMintCount: Number(minted),
        lastMintTime: Number(lastMint),
        nextMintTime: Number(nextMint),
        canMint: canMintNow,
        timeLeft: Number(timeLeft)
      });

      // Load user's real NFTs
      const balance = await readContract({
        contract: simpleNFTContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      }) as bigint;

      console.log("🎨 User NFT balance:", Number(balance));

      const nfts = [];
      const userBalance = Number(balance);
      
      if (userBalance > 0) {
        // Get NFT events to find user's token IDs (simplified approach)
        // Alternative: implement tokenOfOwnerByIndex if available
        
        // For now, we'll check token ownership by trying sequential token IDs
        // In production, you'd use events or enumerable extension
        let foundTokens = 0;
        let tokenId = 1;
        const maxCheck = 100; // Limit search to prevent infinite loop
        
        while (foundTokens < userBalance && tokenId <= maxCheck) {
          try {
            // Check if user owns this token
            const owner = await readContract({
              contract: simpleNFTContract,
              method: "function ownerOf(uint256) view returns (address)",
              params: [BigInt(tokenId)],
            }) as string;
            
            if (owner.toLowerCase() === account.address.toLowerCase()) {
              console.log("🎨 Found user's NFT! Token ID:", tokenId);
              
              // User owns this token, get its metadata
              const tokenURI = await readContract({
                contract: simpleNFTContract,
                method: "function tokenURI(uint256) view returns (string)",
                params: [BigInt(tokenId)],
              }) as string;
              
              console.log("🎨 Token URI:", tokenURI);
              
              // Fetch metadata from IPFS with fallback gateways
              try {
                console.log("🎨 Fetching metadata from:", tokenURI);
                
                const metadata = await fetchFromIPFS(tokenURI) as { name?: string; description?: string; image?: string } | null;
                console.log("🎨 Metadata:", metadata);
                
                // Resolve image URL with ipfs.io gateway
                const imageUrl = metadata?.image ? resolveIPFS(metadata.image) : '';
                
                console.log("🎨 Image URL:", imageUrl);
                
                nfts.push({
                  tokenId,
                  name: metadata?.name || `DeFi Hero #${tokenId}`,
                  description: metadata?.description || "A unique DeFi Learning Hero NFT",
                  image: imageUrl
                });
                foundTokens++;
              } catch (metadataError) {
                console.error(`Failed to fetch metadata for token ${tokenId}:`, metadataError);
                // Add with fallback data
                nfts.push({
                  tokenId,
                  name: `DeFi Hero #${tokenId}`,
                  description: "A unique DeFi Learning Hero NFT",
                  image: ''
                });
                foundTokens++;
              }
            }
          } catch (ownerError) {
            // Token doesn't exist or other error, continue to next
          }
          tokenId++;
        }
      }
      
      console.log("🎨 Final NFTs array:", nfts);
      setUserNFTs(nfts);

    } catch (error) {
      console.error("❌ Failed to load NFT data:", error);
    }
  }, [account, fetchFromIPFS, resolveIPFS]);

  const loadSwapHistory = useCallback(async () => {
    try {
      const history = await readContract({
        contract: simpleSwapContract,
        method: "function getRecentSwaps(uint256) view returns ((address,address,address,uint256,uint256,uint256,uint256)[])",
        params: [BigInt(3)], // Get latest 3 swaps
      });
      setSwapHistory(history as Array<[string, string, string, bigint, bigint, bigint, bigint]>);
    } catch (error) {
      console.error("Error loading swap history:", error);
    }
  }, []);

  // Calculate swap output
  const calculateSwapOutput = useCallback(async (inputAmount: string) => {
    if (!inputAmount || parseFloat(inputAmount) === 0) {
      setSwapToAmount("");
      return;
    }

    try {
      const amountIn = parseTokenAmount(inputAmount);
      
      if (swapDirection === "SUSD_TO_ETH") {
        // Get quote for SUSD -> MockETH
        const quote = await readContract({
          contract: simpleSwapContract,
          method: "function getSwapQuoteSUSDToMockETH(uint256) view returns (uint256,uint256)",
          params: [amountIn],
        });
        const [mockETHOut] = quote as [bigint, bigint];
        setSwapToAmount(formatTokenAmount(mockETHOut));
      } else {
        // Get quote for MockETH -> SUSD  
        const quote = await readContract({
          contract: simpleSwapContract,
          method: "function getSwapQuoteMockETHToSUSD(uint256) view returns (uint256,uint256)",
          params: [amountIn],
        });
        const [susdOut] = quote as [bigint, bigint];
        setSwapToAmount(formatTokenAmount(susdOut));
      }
    } catch (error) {
      console.error("Error calculating swap output:", error);
      setSwapToAmount("0");
    }
  }, [swapDirection]);

  // Toggle swap direction
  const toggleSwapDirection = () => {
    setSwapDirection(prev => prev === "SUSD_TO_ETH" ? "ETH_TO_SUSD" : "SUSD_TO_ETH");
    setSwapFromAmount("");
    setSwapToAmount("");
  };

  const handleClaim = async () => {
    if (!canClaim || !account) return;

    setIsClaimLoading(true);

    try {
      // Prepare the claim transaction
      const transaction = prepareContractCall({
        contract: simpleUSDContract,
        method: "function claimAirdrop()",
        params: [],
      });

      // Send transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      // Show success
      setClaimed(true);
      showTransactionSuccess(result.transactionHash);
      
      // Force token refresh for Thirdweb wallet (tokens should auto-detect after transaction)
      console.log("SUSD claim successful! Token should now appear in Thirdweb View Assets");
      
      // Update achievements
      const now = Date.now();
      const today = new Date().toDateString();
      const updatedAchievements: UserAchievements = {
        ...achievements,
        firstClaim: true,
        dailyClaimer:
          achievements.lastClaimDate ===
          new Date(now - 24 * 60 * 60 * 1000).toDateString()
            ? achievements.dailyClaimer + 1
            : 1,
        lastClaimDate: today,
        nextClaimTime: now + 24 * 60 * 60 * 1000, // 24 hours cooldown
      };

      setAchievements(updatedAchievements);
      localStorage.setItem(
        "defiSimple_achievements",
        JSON.stringify(updatedAchievements)
      );

      // Update balance after successful claim
      setTimeout(async () => {
        const balance = await readContract({
          contract: simpleUSDContract,
          method: "function balanceOf(address) view returns (uint256)",
          params: [account.address],
        });
        setSusdBalance(formatTokenAmount(balance as bigint));
      }, 2000);

      // Set cooldown
      setCanClaim(false);
      updateCountdown(now + 24 * 60 * 60 * 1000);
      setTimeout(() => setClaimed(false), 3000);

    } catch (error) {
      console.error("Claim failed:", error);
      alert("Claim failed: " + (error as Error).message);
    } finally {
      setIsClaimLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!swapFromAmount || !account || isSwapLoading) return;

    setIsSwapLoading(true);

    try {
      const amountIn = parseTokenAmount(swapFromAmount);
      const minAmountOut = parseTokenAmount((parseFloat(swapToAmount) * 0.95).toString()); // 5% slippage tolerance
      
      let transaction;
      let approvalTransaction;

      if (swapDirection === "SUSD_TO_ETH") {
        // Check and approve SUSD allowance
        const allowance = await readContract({
          contract: simpleUSDContract,
          method: "function allowance(address,address) view returns (uint256)",
          params: [account.address, CONTRACT_ADDRESSES.SIMPLE_SWAP],
        });

        if ((allowance as bigint) < amountIn) {
          // Approve SUSD spending
          approvalTransaction = prepareContractCall({
            contract: simpleUSDContract,
            method: "function approve(address,uint256) returns (bool)",
            params: [CONTRACT_ADDRESSES.SIMPLE_SWAP, amountIn],
          });

          const approvalResult = await sendTransaction({
            transaction: approvalTransaction,
            account,
          });
          console.log("SUSD approval successful:", approvalResult.transactionHash);
        }

        // Execute SUSD -> MockETH swap
        transaction = prepareContractCall({
          contract: simpleSwapContract,
          method: "function swapSUSDForMockETH(uint256 susdAmount, uint256 minMockETHOut)",
          params: [amountIn, minAmountOut],
        });
      } else {
        // Check and approve MockETH allowance
        const allowance = await readContract({
          contract: mockETHContract,
          method: "function allowance(address,address) view returns (uint256)",
          params: [account.address, CONTRACT_ADDRESSES.SIMPLE_SWAP],
        });

        if ((allowance as bigint) < amountIn) {
          // Approve MockETH spending
          approvalTransaction = prepareContractCall({
            contract: mockETHContract,
            method: "function approve(address,uint256) returns (bool)",
            params: [CONTRACT_ADDRESSES.SIMPLE_SWAP, amountIn],
          });

          const approvalResult = await sendTransaction({
            transaction: approvalTransaction,
            account,
          });
          console.log("MockETH approval successful:", approvalResult.transactionHash);
        }

        // Execute MockETH -> SUSD swap
        transaction = prepareContractCall({
          contract: simpleSwapContract,
          method: "function swapMockETHForSUSD(uint256 mockETHAmount, uint256 minSUSDOut)",
          params: [amountIn, minAmountOut],
        });
      }

      // Send swap transaction
      const result = await sendTransaction({
        transaction,
        account,
      });

      // Show success
      showTransactionSuccess(result.transactionHash);
      console.log(`${swapDirection} swap successful!`);

      // Reset form and reload data
      setSwapFromAmount("");
      setSwapToAmount("");
      
      // Reload balances and history after successful swap
      setTimeout(async () => {
        await loadBalances();
        await loadSwapHistory();
      }, 2000);

    } catch (error) {
      console.error("Swap failed:", error);
      alert("Swap failed: " + (error as Error).message);
    } finally {
      setIsSwapLoading(false);
    }
  };

  // Load staking data
  const loadStakingData = useCallback(async () => {
    if (!account) return;
    
    try {
      // Get user's staking info
      const stakeInfo = await readContract({
        contract: simpleStakeContract,
        method: "function getStakeInfo(address) view returns (uint256,uint256,uint256,uint256)",
        params: [account.address],
      });
      const [staked, earned] = stakeInfo as [bigint, bigint, bigint, bigint];
      
      setStakedBalance(Number(formatTokenAmount(staked)));
      setEarnedRewards(Number(formatTokenAmount(earned)));

      // Get pool statistics
      const poolData = await readContract({
        contract: simpleStakeContract,
        method: "function getPoolStats() view returns (uint256,uint256,uint256,uint256)",
        params: [],
      });
      const [totalStakedAmount, totalStakers, poolApy, availableRewards] = poolData as [bigint, bigint, bigint, bigint];
      
      setPoolStats({
        totalStaked: Number(formatTokenAmount(totalStakedAmount)),
        totalStakers: Number(totalStakers),
        apy: Number(poolApy),
        availableRewards: Number(formatTokenAmount(availableRewards))
      });
    } catch (error) {
      console.error("Error loading staking data:", error);
    }
  }, [account]);

  const handleStake = async () => {
    if (!stakeAmount || !account) return;
    
    try {
      setIsStakeLoading(true);
      const stakeAmountWei = parseTokenAmount(stakeAmount);
      
      // Check current allowance first
      const currentAllowance = await readContract({
        contract: simpleUSDContract,
        method: "function allowance(address,address) view returns (uint256)",
        params: [account.address, CONTRACT_ADDRESSES.SIMPLE_STAKE],
      });
      
      // Only approve if needed
      if (currentAllowance < stakeAmountWei) {
        console.log("Approving SUSD spending...");
        const approveTransaction = prepareContractCall({
          contract: simpleUSDContract,
          method: "function approve(address,uint256) returns (bool)",
          params: [CONTRACT_ADDRESSES.SIMPLE_STAKE, stakeAmountWei],
        });
        
        await sendTransaction({
          transaction: approveTransaction,
          account: account,
        });
        
        // Wait a moment for approval to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Then stake
      console.log("Staking SUSD tokens...");
      const stakeTransaction = prepareContractCall({
        contract: simpleStakeContract,
        method: "function stake(uint256)",
        params: [stakeAmountWei],
      });
      
      const result = await sendTransaction({
        transaction: stakeTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      setStakeAmount("");
      
      // Reload data after a delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadStakingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Staking failed:", error);
      
      // More user-friendly error messages
      let errorMessage = "Staking failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Try reducing the amount or try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsStakeLoading(false);
    }
  };

  const handleUnstake = async (amount?: string) => {
    if (!account) return;
    
    try {
      setIsUnstakeLoading(true);
      const unstakeAmount = amount ? parseTokenAmount(amount) : BigInt(0); // 0 means unstake all
      
      console.log("Unstaking SUSD tokens...");
      const unstakeTransaction = prepareContractCall({
        contract: simpleStakeContract,
        method: "function unstake(uint256)",
        params: [unstakeAmount],
      });
      
      const result = await sendTransaction({
        transaction: unstakeTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      
      // Reload data after delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadStakingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Unstaking failed:", error);
      
      let errorMessage = "Unstaking failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Please try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsUnstakeLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!account) return;
    
    try {
      console.log("Claiming staking rewards...");
      const claimTransaction = prepareContractCall({
        contract: simpleStakeContract,
        method: "function claimRewards()",
        params: [],
      });
      
      const result = await sendTransaction({
        transaction: claimTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      
      // Reload data after delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadStakingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Claiming rewards failed:", error);
      
      let errorMessage = "Claiming rewards failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Please try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        } else if (error.message.includes("No rewards")) {
          errorMessage = "No rewards available to claim.";
        }
      }
      
      alert(errorMessage);
    }
  };

  // Load lending data
  const loadLendingData = useCallback(async () => {
    if (!account) return;
    
    try {
      // Get user's lending info
      const lendInfo = await readContract({
        contract: simpleLendContract,
        method: "function getLendInfo(address) view returns (uint256,uint256,uint256,uint256)",
        params: [account.address],
      });
      const [deposited, earned] = lendInfo as [bigint, bigint, bigint, bigint];
      
      setLentBalance(Number(formatTokenAmount(deposited)));
      setLendingEarned(Number(formatTokenAmount(earned)));

      // Get pool statistics
      const poolData = await readContract({
        contract: simpleLendContract,
        method: "function getPoolStats() view returns (uint256,uint256,uint256,uint256,uint256)",
        params: [],
      });
      const [totalLentAmount, totalLenders, poolApy, availableInterest, utilizationRate] = poolData as [bigint, bigint, bigint, bigint, bigint];
      
      setLendingStats({
        totalLent: Number(formatTokenAmount(totalLentAmount)),
        totalLenders: Number(totalLenders),
        apy: Number(poolApy),
        availableInterest: Number(formatTokenAmount(availableInterest)),
        utilizationRate: Number(utilizationRate)
      });
    } catch (error) {
      console.error("Error loading lending data:", error);
    }
  }, [account]);


  const handleLend = async () => {
    if (!lendAmount || !account) return;
    
    try {
      setIsLendLoading(true);
      const lendAmountWei = parseTokenAmount(lendAmount);
      
      // Check current allowance first
      const currentAllowance = await readContract({
        contract: simpleUSDContract,
        method: "function allowance(address,address) view returns (uint256)",
        params: [account.address, CONTRACT_ADDRESSES.SIMPLE_LEND],
      });
      
      // Only approve if needed
      if (currentAllowance < lendAmountWei) {
        console.log("Approving SUSD spending for lending...");
        const approveTransaction = prepareContractCall({
          contract: simpleUSDContract,
          method: "function approve(address,uint256) returns (bool)",
          params: [CONTRACT_ADDRESSES.SIMPLE_LEND, lendAmountWei],
        });
        
        await sendTransaction({
          transaction: approveTransaction,
          account: account,
        });
        
        // Wait a moment for approval to be confirmed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Then deposit/lend
      console.log("Depositing SUSD to lending pool...");
      const lendTransaction = prepareContractCall({
        contract: simpleLendContract,
        method: "function deposit(uint256)",
        params: [lendAmountWei],
      });
      
      const result = await sendTransaction({
        transaction: lendTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      setLendAmount("");
      
      // Reload data after a delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadLendingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Lending failed:", error);
      
      // More user-friendly error messages
      let errorMessage = "Lending failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Try reducing the amount or try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLendLoading(false);
    }
  };

  const handleWithdraw = async (amount?: string) => {
    if (!account) return;
    
    try {
      setIsWithdrawLoading(true);
      const withdrawAmount = amount ? parseTokenAmount(amount) : BigInt(0); // 0 means withdraw all
      
      console.log("Withdrawing SUSD from lending pool...");
      const withdrawTransaction = prepareContractCall({
        contract: simpleLendContract,
        method: "function withdraw(uint256)",
        params: [withdrawAmount],
      });
      
      const result = await sendTransaction({
        transaction: withdrawTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      
      // Reload data after delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadLendingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Withdrawing failed:", error);
      
      let errorMessage = "Withdrawing failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Please try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const handleClaimInterest = async () => {
    if (!account) return;
    
    try {
      console.log("Claiming lending interest...");
      const claimTransaction = prepareContractCall({
        contract: simpleLendContract,
        method: "function claimInterest()",
        params: [],
      });
      
      const result = await sendTransaction({
        transaction: claimTransaction,
        account: account,
      });
      
      showTransactionSuccess(result.transactionHash);
      
      // Reload data after delay
      setTimeout(async () => {
        await Promise.all([loadBalances(), loadLendingData()]);
      }, 3000);
      
    } catch (error: unknown) {
      console.error("Claiming interest failed:", error);
      
      let errorMessage = "Claiming interest failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("gas")) {
          errorMessage = "Gas estimation failed. Please try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Network error. Please try again in a moment.";
        } else if (error.message.includes("No interest")) {
          errorMessage = "No interest available to claim.";
        }
      }
      
      alert(errorMessage);
    }
  };

  // Image upload handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB");
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to IPFS
  const uploadImageToIPFS = async (file: File): Promise<string> => {
    try {
      setIsImageUploading(true);
      console.log("📤 Uploading image file:", file.name, "Size:", file.size, "Type:", file.type);
      
      // Use Thirdweb V5 upload API correctly
      const uris = await upload({
        client,
        files: [file],
      });
      
      console.log("🔍 Upload response:", uris);
      console.log("🔍 Upload response type:", typeof uris);
      console.log("🔍 Upload response length:", Array.isArray(uris) ? uris.length : 'Not array');
      
      // Check if we get a valid IPFS URI
      const imageUri = Array.isArray(uris) ? uris[0] : uris;
      console.log("✅ Image uploaded to IPFS:", imageUri);
      
      // Validate the URI format
      if (!imageUri || (!imageUri.startsWith('ipfs://') && !imageUri.startsWith('https://'))) {
        throw new Error(`Invalid IPFS URI returned: ${imageUri}`);
      }
      
      console.log("🌐 Testing image URL:", imageUri.startsWith('ipfs://') ? imageUri.replace('ipfs://', 'https://thirdweb.com/ipfs/') : imageUri);
      
      return imageUri;
    } catch (error) {
      console.error("❌ Image upload failed:", error);
      throw new Error(`Failed to upload image to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImageUploading(false);
    }
  };

  // Create and upload JSON metadata to IPFS
  const uploadMetadataToIPFS = async (imageUri: string): Promise<string> => {
    try {
      const metadata = {
        name: nftName,
        description: nftDescription,
        image: imageUri,
        attributes: [
          {
            trait_type: "Collection",
            value: "DeFi Learning Heroes"
          },
          {
            trait_type: "Created At",
            value: new Date().toISOString()
          }
        ]
      };

      console.log("📋 Creating metadata JSON:", metadata);

      const metadataFile = new File(
        [JSON.stringify(metadata, null, 2)],
        "metadata.json",
        { type: "application/json" }
      );

      console.log("📤 Uploading metadata file size:", metadataFile.size);

      const uris = await upload({
        client,
        files: [metadataFile],
      });

      console.log("🔍 Metadata upload response:", uris);
      console.log("🔍 Metadata response type:", typeof uris);
      console.log("🔍 Metadata response length:", Array.isArray(uris) ? uris.length : 'Not array');

      const metadataUri = Array.isArray(uris) ? uris[0] : uris;
      console.log("✅ Metadata uploaded to IPFS:", metadataUri);

      // Validate the metadata URI format
      if (!metadataUri || (!metadataUri.startsWith('ipfs://') && !metadataUri.startsWith('https://'))) {
        throw new Error(`Invalid metadata IPFS URI returned: ${metadataUri}`);
      }

      console.log("🌐 Testing metadata URL:", metadataUri.startsWith('ipfs://') ? metadataUri.replace('ipfs://', 'https://thirdweb.com/ipfs/') : metadataUri);

      return metadataUri;
    } catch (error) {
      console.error("❌ Metadata upload failed:", error);
      throw new Error("Failed to upload metadata to IPFS");
    }
  };

  // Main mint function
  const handleMint = async () => {
    if (!account || !selectedImage || !nftName || !nftDescription) return;
    
    try {
      setIsMintLoading(true);

      // Check if user can mint
      if (!mintStats.canMint) {
        alert("You are still in cooldown period. Please wait before minting again.");
        return;
      }

      // Check SUSD balance and allowance
      const balance = await readContract({
        contract: simpleUSDContract,
        method: "function balanceOf(address) view returns (uint256)",
        params: [account.address],
      }) as bigint;

      const mintPriceInWei = parseTokenAmount("10");
      if (balance < mintPriceInWei) {
        alert("Insufficient SUSD balance. You need 10 SUSD to mint an NFT.");
        return;
      }

      // Check allowance
      const allowance = await readContract({
        contract: simpleUSDContract,
        method: "function allowance(address,address) view returns (uint256)",
        params: [account.address, CONTRACT_ADDRESSES.SIMPLE_NFT],
      }) as bigint;

      // Approve if necessary
      if (allowance < mintPriceInWei) {
        const approveTx = prepareContractCall({
          contract: simpleUSDContract,
          method: "function approve(address,uint256) returns (bool)",
          params: [CONTRACT_ADDRESSES.SIMPLE_NFT, mintPriceInWei],
        });

        await sendTransaction({
          transaction: approveTx,
          account,
        });

        // Wait for approval confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 1. Upload image to IPFS
      console.log("Uploading image to IPFS...");
      const imageUri = await uploadImageToIPFS(selectedImage);
      console.log("Image uploaded:", imageUri);

      // 2. Create and upload metadata to IPFS
      console.log("Creating metadata and uploading to IPFS...");
      const metadataUri = await uploadMetadataToIPFS(imageUri);
      console.log("Metadata uploaded:", metadataUri);

      // 3. Mint NFT with metadata URI
      console.log("Minting NFT...");
      const mintTx = prepareContractCall({
        contract: simpleNFTContract,
        method: "function mintWithURI(string)",
        params: [metadataUri],
      });

      const result = await sendTransaction({
        transaction: mintTx,
        account,
      });

      console.log("NFT minted successfully:", result.transactionHash);
      
      // Show success modal
      showTransactionSuccess(result.transactionHash);

      // Reset form
      setNftName("");
      setNftDescription("");
      setSelectedImage(null);
      setImagePreview("");

      // Reload NFT data
      setTimeout(async () => {
        await Promise.all([loadNFTData(), loadBalances()]);
      }, 3000);

    } catch (error: unknown) {
      console.error("NFT minting failed:", error);
      
      let errorMessage = "NFT minting failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("User rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient ETH for gas fees.";
        } else if (error.message.includes("SimpleNFT__MintCooldownActive")) {
          errorMessage = "You are still in cooldown period. Please wait before minting again.";
        } else if (error.message.includes("SimpleNFT__InsufficientSUSD")) {
          errorMessage = "Insufficient SUSD balance or approval needed.";
        } else if (error.message.includes("SimpleNFT__MintingNotActive")) {
          errorMessage = "Minting is currently disabled.";
        } else if (error.message.includes("SimpleNFT__MaxSupplyReached")) {
          errorMessage = "Maximum NFT supply has been reached.";
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsMintLoading(false);
    }
  };



  // Simple NFT Image component with ipfs.io gateway only
  const NFTImage: React.FC<{ src: string; alt: string; tokenId: number }> = ({ src, alt, tokenId }) => {
    const [failed, setFailed] = useState(false);

    const handleError = () => {
      console.log(`❌ Failed to load image for token ${tokenId}:`, src);
      setFailed(true);
    };

    if (failed) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <FiImage size={24} className="text-purple-600" />
        </div>
      );
    }

    return (
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-cover rounded-lg"
        onError={handleError}
        loading="lazy"
      />
    );
  };

  const openEducationModal = (content: string) => {
    setCurrentEducationContent(content);
    setIsEducationModalOpen(true);
  };

  // Load balances and history when account changes
  useEffect(() => {
    if (account) {
      loadBalances();
      loadSwapHistory();
      loadStakingData();
      loadLendingData();
      loadNFTData();
    }
  }, [account, loadBalances, loadSwapHistory, loadStakingData, loadLendingData, loadNFTData]);

  // Calculate swap output when input changes
  useEffect(() => {
    if (swapFromAmount) {
      calculateSwapOutput(swapFromAmount);
    }
  }, [swapFromAmount, swapDirection, calculateSwapOutput]);

  interface ResourceType {
    title: string;
    description: string;
    url: string;
  }

  interface EducationContent {
    title: string;
    main: string;
    eli5: string;
    resources: ResourceType[];
  }

  const getEducationContent = (): EducationContent => {
    const content: Record<string, EducationContent> = {
      airdrop: {
        title: "What is an Airdrop?",
        main: "An airdrop is when cryptocurrency projects give away free tokens to users. It's like receiving a digital gift that could have real value. Projects do this to build their community, reward early supporters, and create awareness about their platform.",
        eli5: "Imagine you're walking down the street and someone from a new candy store runs up and gives you a bag of free candy! That's what an airdrop is like - except instead of candy, you get digital coins that might be worth money someday. The candy store (crypto project) gives away free samples hoping you'll become a regular customer!",
        resources: [
          {
            title: "CoinGecko Airdrop Guide",
            description: "Complete beginner's guide to crypto airdrops",
            url: "https://www.coingecko.com/learn/what-are-cryptocurrency-airdrops",
          },
          {
            title: "Airdrop Alert Blog",
            description: "Latest airdrop opportunities and farming guides",
            url: "https://airdropalert.com/blog",
          },
          {
            title: "Bankless Airdrop Guide",
            description: "Advanced strategies for airdrop hunting",
            url: "https://newsletter.banklesshq.com/p/how-to-catch-crypto-airdrops",
          },
        ],
      },
      swap: {
        title: "What is Token Swapping?",
        main: "Swapping means exchanging one cryptocurrency for another using a decentralized exchange (DEX). Unlike traditional exchanges, DEXs use smart contracts and don't require you to create an account or trust a company with your funds.",
        eli5: "It's like trading Pokemon cards with your friend, but instead of cards, you're trading digital coins! And instead of your friend, you're trading with a super smart computer that makes sure the trade is fair for everyone.",
        resources: [
          {
            title: "Uniswap Documentation",
            description: "How automated market makers work",
            url: "https://docs.uniswap.org/concepts/introduction",
          },
          {
            title: "DeFi Pulse DEX Guide",
            description: "Top decentralized exchanges explained",
            url: "https://www.defipulse.com/defi-list",
          },
          {
            title: "Academy Binance DEX",
            description: "Centralized vs Decentralized exchanges",
            url: "https://academy.binance.com/en/articles/what-is-a-decentralized-exchange-dex",
          },
        ],
      },
      stake: {
        title: "What is Staking?",
        main: "Staking means locking up your cryptocurrency to help secure a blockchain network. In return, you earn rewards - like interest in a savings account, but often with higher returns. Your tokens help validate transactions and keep the network safe.",
        eli5: "Imagine you have a piggy bank, but instead of just sitting there, your piggy bank helps the neighborhood by checking that people are being honest with their money. Because your piggy bank is so helpful, the neighborhood gives you extra coins as a 'thank you' - that's staking!",
        resources: [
          {
            title: "Coinbase Learn: Staking",
            description: "Staking basics for beginners",
            url: "https://www.coinbase.com/learn/crypto-basics/what-is-staking",
          },
          {
            title: "Ethereum.org Staking Guide",
            description: "Official Ethereum staking documentation",
            url: "https://ethereum.org/en/staking/",
          },
          {
            title: "CoinTelegraph Staking Guide",
            description: "Complete DeFi staking guide",
            url: "https://cointelegraph.com/learn/articles/defi-staking-proof-of-stake-pos-coins",
          },
        ],
      },
      lend: {
        title: "What is DeFi Lending?",
        main: "DeFi lending allows you to earn interest by lending your cryptocurrency to others, or borrow crypto by providing collateral. It's like a bank, but run by smart contracts instead of people, often offering better rates and 24/7 availability.",
        eli5: "Remember when you lent your favorite toy to your friend and they gave you some of their candy as a 'thank you'? DeFi lending is like that - you lend your digital money to others, and they give you extra money back as a thank you!",
        resources: [
          {
            title: "Aave Documentation",
            description: "Leading DeFi lending protocol",
            url: "https://docs.aave.com/hub/",
          },
          {
            title: "Compound Finance Guide",
            description: "Algorithmic money market protocol",
            url: "https://compound.finance/docs",
          },
          {
            title: "DeFiPulse Lending",
            description: "Top DeFi lending platforms",
            url: "https://www.defipulse.com/lending",
          },
        ],
      },
      mint: {
        title: "What are NFTs?",
        main: "NFTs (Non-Fungible Tokens) are unique digital items that you can truly own, trade, and sell. Unlike regular tokens where each one is identical, every NFT is different and can represent digital art, collectibles, game items, or even real-world assets.",
        eli5: "You know how every Pokemon card is different and special? Some are rare, some are common, and you can trade them with friends? NFTs are like digital Pokemon cards - each one is unique and belongs to whoever owns it!",
        resources: [
          {
            title: "OpenSea Learn",
            description: "Complete NFT education center",
            url: "https://opensea.io/learn",
          },
          {
            title: "Ethereum.org NFTs",
            description: "What are Non-Fungible Tokens?",
            url: "https://ethereum.org/en/nft/",
          },
          {
            title: "CoinGecko NFT Guide",
            description: "NFTs explained for beginners",
            url: "https://www.coingecko.com/learn/non-fungible-tokens-nft-explained",
          },
        ],
      },
    };
    return content[currentEducationContent] || content.airdrop;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-2xl font-bold text-blue-600">
                DeFi<span className="text-purple-600">Simple</span>
              </Link>
              <div className="hidden sm:block text-sm text-gray-500">
                Simple DeFi Ecosystem
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Testnet
              </div>
              <ConnectWallet />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => tab.active && setActiveTab(tab.id)}
                  disabled={!tab.active}
                  className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === tab.id && tab.active
                      ? "bg-blue-600 text-white shadow-lg cursor-pointer"
                      : tab.active
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  }`}>
                  <IconComponent
                    className="mr-2"
                    size={18}
                  />
                  {tab.name}
                  {!tab.active && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Claim Tab Content */}
        {activeTab === "claim" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            {/* Main Claim Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                  <FiGift
                    size={32}
                    className="text-white"
                  />
                </div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Free SimpleUSD Airdrop
                </h1>

                <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                  Claim your free 1000 SUSD tokens to start your DeFi journey.
                  No gas fees, no complexity!
                </p>

                {isWalletConnected && (
                  <p className="text-lg text-green-600 mb-4 font-semibold">
                    Your SUSD Balance: {susdBalance} SUSD
                  </p>
                )}

                {canClaim ? (
                  <div className="relative group">
                    <motion.button
                      whileHover={{ scale: isWalletConnected ? 1.05 : 1 }}
                      whileTap={{ scale: isWalletConnected ? 0.95 : 1 }}
                      onClick={isWalletConnected ? handleClaim : undefined}
                      disabled={!isWalletConnected || isClaimLoading}
                      className={`px-12 py-4 text-white text-xl font-bold rounded-2xl transition-all duration-300 ${
                        isWalletConnected && !isClaimLoading
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-xl cursor-pointer"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}>
                      {isClaimLoading ? "Claiming..." : "Claim 1000 SUSD"}
                    </motion.button>
                    {!isWalletConnected && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                          Connect Wallet to transact
                        </div>
                      </div>
                    )}
                  </div>
                ) : claimed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center px-12 py-4 bg-green-600 text-white text-xl font-bold rounded-2xl">
                    ✅ Claimed Successfully!
                  </motion.div>
                ) : (
                  <div className="px-8 py-4 bg-gray-400 text-white text-xl font-bold rounded-2xl cursor-not-allowed max-w-fit mx-auto">
                    Already Claimed Today
                  </div>
                )}

                {/* Educational Button */}
                <div className="mt-6">
                  <button
                    onClick={() => openEducationModal("airdrop")}
                    className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                    <FiInfo
                      className="mr-2"
                      size={16}
                    />
                    What is an Airdrop?
                  </button>
                </div>
              </div>
            </div>

            {/* Next Airdrop Timer */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiClock
                    className="text-blue-600 mr-3"
                    size={24}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {canClaim ? "Ready to Claim!" : "Next Airdrop In"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {canClaim
                        ? "You can claim your daily airdrop now!"
                        : "Daily airdrops available every 24 hours"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-2xl font-bold">
                  {canClaim ? (
                    <span className="text-green-600">Available!</span>
                  ) : (
                    <>
                      <span className="text-blue-600">
                        {timeLeft.hours.toString().padStart(2, "0")}
                      </span>
                      <span className="text-gray-400">:</span>
                      <span className="text-blue-600">
                        {timeLeft.minutes.toString().padStart(2, "0")}
                      </span>
                      <span className="text-gray-400">:</span>
                      <span className="text-blue-600">
                        {timeLeft.seconds.toString().padStart(2, "0")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Achievement Badge System */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Achievements
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-xl border ${
                    achievements.firstClaim
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        achievements.firstClaim ? "bg-green-600" : "bg-gray-300"
                      }`}>
                      <FiGift
                        className="text-white"
                        size={20}
                      />
                    </div>
                    <h4 className="font-medium text-gray-900">First Claim</h4>
                    <p className="text-sm text-gray-600">
                      {achievements.firstClaim
                        ? "✅ Completed!"
                        : "Claim your first airdrop"}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    achievements.dailyClaimer >= 7
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        achievements.dailyClaimer >= 7
                          ? "bg-green-600"
                          : "bg-gray-300"
                      }`}>
                      <span className="text-white text-lg">🔄</span>
                    </div>
                    <h4 className="font-medium text-gray-900">Daily Claimer</h4>
                    <p className="text-sm text-gray-600">
                      {achievements.dailyClaimer >= 7
                        ? "✅ Completed!"
                        : `${achievements.dailyClaimer}/7 days`}
                    </p>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border ${
                    achievements.defiExplorer >= 6
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}>
                  <div className="text-center">
                    <div
                      className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                        achievements.defiExplorer >= 6
                          ? "bg-green-600"
                          : "bg-gray-300"
                      }`}>
                      <span className="text-white text-lg">👑</span>
                    </div>
                    <h4 className="font-medium text-gray-900">DeFi Explorer</h4>
                    <p className="text-sm text-gray-600">
                      {achievements.defiExplorer >= 6
                        ? "✅ Completed!"
                        : `${achievements.defiExplorer}/6 features used`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Swap Tab Content */}
        {activeTab === "swap" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-6">
                  <FiRefreshCw
                    size={32}
                    className="text-white"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Token Swap
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Exchange your tokens instantly with our simple swap interface
                </p>
              </div>

              <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From
                    </label>
                    <div className="flex space-x-2">
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                        {swapDirection === "SUSD_TO_ETH" ? "SUSD" : "MockETH"}
                      </div>
                      <input
                        type="number"
                        placeholder="0.0"
                        value={swapFromAmount}
                        onChange={(e) => setSwapFromAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Balance: {swapDirection === "SUSD_TO_ETH" ? susdBalance : mockEthBalance} {swapDirection === "SUSD_TO_ETH" ? "SUSD" : "MockETH"}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button 
                      onClick={toggleSwapDirection}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                      title="Switch tokens"
                    >
                      ↓
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To
                    </label>
                    <div className="flex space-x-2">
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                        {swapDirection === "SUSD_TO_ETH" ? "MockETH" : "SUSD"}
                      </div>
                      <input
                        type="text"
                        placeholder="0.0"
                        value={swapToAmount}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Balance: {swapDirection === "SUSD_TO_ETH" ? mockEthBalance : susdBalance} {swapDirection === "SUSD_TO_ETH" ? "MockETH" : "SUSD"}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 text-center">
                    Rate: 1 {swapDirection === "SUSD_TO_ETH" ? "SUSD = 0.00025 MockETH" : "MockETH = 4000 SUSD"} | Fee: 0.3%
                  </div>

                  <div className="relative group">
                    <motion.button
                      whileHover={{
                        scale: isWalletConnected && swapFromAmount ? 1.02 : 1,
                      }}
                      whileTap={{
                        scale: isWalletConnected && swapFromAmount ? 0.98 : 1,
                      }}
                      onClick={isWalletConnected && !isSwapLoading ? handleSwap : undefined}
                      disabled={!isWalletConnected || !swapFromAmount || isSwapLoading}
                      className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                      {isSwapLoading ? "Swapping..." : `Swap ${swapDirection === "SUSD_TO_ETH" ? "SUSD → MockETH" : "MockETH → SUSD"}`}
                    </motion.button>
                    {!isWalletConnected && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                          Connect Wallet to transact
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => openEducationModal("swap")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo
                    className="mr-2"
                    size={16}
                  />
                  How does swapping work?
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Swaps
              </h3>
              <div className="space-y-2">
                {swapHistory.length > 0 ? (
                  swapHistory.map((swap, index) => {
                    const isFromSUSD = swap[1].toLowerCase() === CONTRACT_ADDRESSES.SIMPLE_USD.toLowerCase();
                    const fromToken = isFromSUSD ? "SUSD" : "MockETH";
                    const toToken = isFromSUSD ? "MockETH" : "SUSD";
                    const fromAmount = formatTokenAmount(swap[3]);
                    const toAmount = formatTokenAmount(swap[4]);
                    const timestamp = new Date(Number(swap[5]) * 1000).toLocaleDateString();
                    
                    return (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <div>
                          <span className="text-gray-600">{fromAmount} {fromToken} → {toAmount} {toToken}</span>
                          <div className="text-xs text-gray-400">{timestamp}</div>
                        </div>
                        <span className="text-sm text-green-600">Completed</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No recent swaps found
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stake Tab Content */}
        {activeTab === "stake" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                  <FiTrendingUp
                    size={32}
                    className="text-white"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Stake SimpleUSD
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Earn 12% APY by staking your SUSD tokens. No lock-up period!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Stake Tokens
                  </h3>
                  <div className="space-y-4">
                    {/* Balance Display */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Your SUSD Balance:</span>
                        <span className="text-lg font-bold text-gray-900">{parseFloat(susdBalance).toLocaleString()} SUSD</span>
                      </div>
                      {parseFloat(susdBalance) === 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          💡 Claim free SUSD from the Claim tab first
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Stake
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Enter SUSD amount"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            stakeAmount && parseFloat(stakeAmount) > parseFloat(susdBalance)
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-green-500 focus:border-green-500"
                          }`}
                        />
                        {parseFloat(susdBalance) > 0 && (
                          <button
                            type="button"
                            onClick={() => setStakeAmount(susdBalance)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      {stakeAmount && parseFloat(stakeAmount) > parseFloat(susdBalance) && (
                        <div className="text-sm text-red-600 mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          Insufficient balance. You can stake up to {parseFloat(susdBalance).toLocaleString()} SUSD
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated annual earnings:{" "}
                      {stakeAmount
                        ? (parseFloat(stakeAmount) * 0.12).toFixed(2)
                        : "0"}{" "}
                      SUSD
                    </div>
                    <div className="relative group">
                      {(() => {
                        const isAmountValid = stakeAmount && parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) <= parseFloat(susdBalance);
                        const canStake = isWalletConnected && isAmountValid && !isStakeLoading;
                        
                        return (
                          <>
                            <motion.button
                              whileHover={{
                                scale: canStake ? 1.02 : 1,
                              }}
                              whileTap={{
                                scale: canStake ? 0.98 : 1,
                              }}
                              onClick={canStake ? handleStake : undefined}
                              disabled={!canStake}
                              className={`w-full py-3 font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                !isWalletConnected || isStakeLoading
                                  ? "bg-gray-300 text-gray-500"
                                  : !stakeAmount
                                  ? "bg-gray-300 text-gray-500"
                                  : stakeAmount && parseFloat(stakeAmount) > parseFloat(susdBalance)
                                  ? "bg-red-500 text-white"
                                  : "bg-green-600 text-white hover:bg-green-700"
                              }`}>
                              {isStakeLoading 
                                ? "Staking..." 
                                : !isWalletConnected
                                ? "Connect Wallet to Stake"
                                : !stakeAmount
                                ? "Enter Amount to Stake"
                                : stakeAmount && parseFloat(stakeAmount) > parseFloat(susdBalance)
                                ? "Insufficient Balance"
                                : "Stake SUSD"
                              }
                            </motion.button>
                            {!isWalletConnected && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                                  Connect Wallet to transact
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Position
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Staked Balance:</span>
                      <span className="font-semibold">
                        {stakedBalance.toLocaleString()} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Earned Rewards:</span>
                      <span className="font-semibold text-green-600">
                        {earnedRewards.toFixed(4)} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">APY:</span>
                      <span className="font-semibold">{poolStats.apy}%</span>
                    </div>
                    {earnedRewards > 0 && (
                      <div className="relative group">
                        <button
                          onClick={isWalletConnected ? handleClaimRewards : undefined}
                          disabled={!isWalletConnected || earnedRewards === 0}
                          className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                          Claim {earnedRewards.toFixed(4)} SUSD Rewards
                        </button>
                        {!isWalletConnected && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                              Connect Wallet to transact
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {stakedBalance > 0 && (
                      <div className="relative group">
                        <button
                          onClick={isWalletConnected && !isUnstakeLoading ? () => handleUnstake() : undefined}
                          disabled={!isWalletConnected || stakedBalance === 0 || isUnstakeLoading}
                          className="w-full py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                          {isUnstakeLoading ? "Unstaking..." : `Unstake All ${stakedBalance.toFixed(2)} SUSD`}
                        </button>
                        {!isWalletConnected && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                              Connect Wallet to transact
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pool Statistics */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pool Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {poolStats.totalStaked.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Total Staked SUSD</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {poolStats.totalStakers}
                    </div>
                    <div className="text-sm text-gray-600">Active Stakers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {poolStats.apy}%
                    </div>
                    <div className="text-sm text-gray-600">Current APY</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {poolStats.availableRewards.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Available Rewards</div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => openEducationModal("stake")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo
                    className="mr-2"
                    size={16}
                  />
                  How does staking work?
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Lend Tab Content */}
        {activeTab === "lend" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
                  <FiDollarSign
                    size={32}
                    className="text-white"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Lend SimpleUSD
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Lend your SUSD to the pool and earn 8% APY
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Lend to Pool
                  </h3>
                  <div className="space-y-4">
                    {/* Balance Display */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Your SUSD Balance:</span>
                        <span className="text-lg font-bold text-gray-900">{parseFloat(susdBalance).toLocaleString()} SUSD</span>
                      </div>
                      {parseFloat(susdBalance) === 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          💡 Claim free SUSD from the Claim tab first
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Lend
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Enter SUSD amount"
                          value={lendAmount}
                          onChange={(e) => setLendAmount(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            lendAmount && parseFloat(lendAmount) > parseFloat(susdBalance)
                              ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                          }`}
                        />
                        {parseFloat(susdBalance) > 0 && (
                          <button
                            type="button"
                            onClick={() => setLendAmount(susdBalance)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      {lendAmount && parseFloat(lendAmount) > parseFloat(susdBalance) && (
                        <div className="text-sm text-red-600 mt-1 flex items-center">
                          <span className="mr-1">⚠️</span>
                          Insufficient balance. You can lend up to {parseFloat(susdBalance).toLocaleString()} SUSD
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated annual earnings:{" "}
                      {lendAmount
                        ? (parseFloat(lendAmount) * 0.08).toFixed(2)
                        : "0"}{" "}
                      SUSD
                    </div>
                    <div className="relative group">
                      {(() => {
                        const isAmountValid = lendAmount && parseFloat(lendAmount) > 0 && parseFloat(lendAmount) <= parseFloat(susdBalance);
                        const canLend = isWalletConnected && isAmountValid && !isLendLoading;
                        
                        return (
                          <>
                            <motion.button
                              whileHover={{
                                scale: canLend ? 1.02 : 1,
                              }}
                              whileTap={{
                                scale: canLend ? 0.98 : 1,
                              }}
                              onClick={canLend ? handleLend : undefined}
                              disabled={!canLend}
                              className={`w-full py-3 font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                !isWalletConnected || isLendLoading
                                  ? "bg-gray-300 text-gray-500"
                                  : !lendAmount
                                  ? "bg-gray-300 text-gray-500"
                                  : lendAmount && parseFloat(lendAmount) > parseFloat(susdBalance)
                                  ? "bg-red-500 text-white"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}>
                              {isLendLoading 
                                ? "Lending..." 
                                : !isWalletConnected
                                ? "Connect Wallet to Lend"
                                : !lendAmount
                                ? "Enter Amount to Lend"
                                : lendAmount && parseFloat(lendAmount) > parseFloat(susdBalance)
                                ? "Insufficient Balance"
                                : "Lend to Pool"
                              }
                            </motion.button>
                            {!isWalletConnected && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                                  Connect Wallet to transact
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Lending Position
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lent Balance:</span>
                      <span className="font-semibold">
                        {lentBalance.toLocaleString()} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Earned:</span>
                      <span className="font-semibold text-blue-600">
                        {lendingEarned.toFixed(4)} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">APY:</span>
                      <span className="font-semibold">{lendingStats.apy}%</span>
                    </div>
                    {lendingEarned > 0 && (
                      <div className="relative group">
                        <button
                          onClick={isWalletConnected ? handleClaimInterest : undefined}
                          disabled={!isWalletConnected || lendingEarned === 0}
                          className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                          Claim {lendingEarned.toFixed(4)} SUSD Interest
                        </button>
                        {!isWalletConnected && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                              Connect Wallet to transact
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {lentBalance > 0 && (
                      <div className="relative group">
                        <button
                          onClick={isWalletConnected && !isWithdrawLoading ? () => handleWithdraw() : undefined}
                          disabled={!isWalletConnected || lentBalance === 0 || isWithdrawLoading}
                          className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                          {isWithdrawLoading ? "Withdrawing..." : `Withdraw All ${lentBalance.toFixed(2)} SUSD`}
                        </button>
                        {!isWalletConnected && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                              Connect Wallet to transact
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => openEducationModal("lend")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo
                    className="mr-2"
                    size={16}
                  />
                  How does lending work?
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pool Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lendingStats.totalLent.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Lent SUSD</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {lendingStats.totalLenders}
                  </div>
                  <div className="text-sm text-gray-600">Active Lenders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {lendingStats.apy}%
                  </div>
                  <div className="text-sm text-gray-600">Current APY</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {lendingStats.utilizationRate}%
                  </div>
                  <div className="text-sm text-gray-600">Utilization Rate</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mint Tab Content */}
        {activeTab === "mint" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            
            {/* Collection Stats Header */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{collectionStats.totalSupply}</div>
                  <div className="text-sm text-gray-600">Total Minted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{collectionStats.maxSupply}</div>
                  <div className="text-sm text-gray-600">Max Supply</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{collectionStats.mintPrice} SUSD</div>
                  <div className="text-sm text-gray-600">Mint Price</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{mintStats.userMintCount}</div>
                  <div className="text-sm text-gray-600">Your NFTs</div>
                </div>
              </div>
            </div>

            {/* Main Mint Section */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-600 rounded-full mb-6">
                  <FiImage size={32} className="text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Mint NFT</h1>
                <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                  Create your own NFT from the DeFi Learning Heroes collection
                </p>
                {!mintStats.canMint && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 max-w-md mx-auto">
                    <p className="text-yellow-800 text-sm">
                      ⏳ Cooldown active. Next mint available in {Math.ceil(mintStats.timeLeft / 60)} minutes
                    </p>
                  </div>
                )}
              </div>

              <div className="max-w-lg mx-auto bg-white rounded-2xl p-6 shadow-lg">
                <div className="space-y-6">
                  
                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Image
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-400 transition-colors">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img 
                            src={imagePreview} 
                            alt="NFT Preview" 
                            className="max-w-full h-48 object-contain mx-auto rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setSelectedImage(null);
                              setImagePreview("");
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FiImage size={32} className="mx-auto text-gray-400" />
                          <div className="text-gray-600">
                            <label className="cursor-pointer text-pink-600 hover:text-pink-700">
                              Choose an image
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                              />
                            </label>
                            {" "}or drag and drop
                          </div>
                          <div className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</div>
                        </div>
                      )}
                    </div>
                    {isImageUploading && (
                      <div className="text-center mt-2 text-sm text-pink-600">
                        Uploading image to IPFS...
                      </div>
                    )}
                  </div>

                  {/* NFT Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NFT Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter NFT name"
                      value={nftName}
                      onChange={(e) => setNftName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      placeholder="Describe your NFT"
                      value={nftDescription}
                      onChange={(e) => setNftDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  {/* Mint Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Mint Price:</span>
                      <span className="font-semibold">{collectionStats.mintPrice} SUSD</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Your Balance:</span>
                      <span className="font-semibold">{susdBalance} SUSD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Storage:</span>
                      <span className="font-semibold text-pink-600">IPFS (Decentralized)</span>
                    </div>
                  </div>

                  {/* Mint Button */}
                  <div className="relative group">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={isWalletConnected ? handleMint : undefined}
                      disabled={
                        !isWalletConnected || 
                        !selectedImage || 
                        !nftName || 
                        !nftDescription || 
                        !mintStats.canMint ||
                        isMintLoading
                      }
                      className="w-full py-4 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                      {isMintLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Minting...</span>
                        </>
                      ) : (
                        <>
                          <FiImage size={16} />
                          <span>Mint NFT</span>
                        </>
                      )}
                    </motion.button>
                    {!isWalletConnected && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                          Connect Wallet to mint
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => openEducationModal("mint")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo className="mr-2" size={16} />
                  What are NFTs?
                </button>
              </div>
            </div>

            {/* Your Collection Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Collection
                </h3>
                <button
                  onClick={loadNFTData}
                  className="px-3 py-1 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors text-sm"
                >
                  🔄 Refresh
                </button>
              </div>
              {userNFTs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userNFTs.map((nft) => (
                    <div key={nft.tokenId} className="bg-gray-50 rounded-lg p-4">
                      <div className="aspect-square bg-gradient-to-br from-pink-200 to-purple-200 rounded-lg overflow-hidden mb-3">
                        {nft.image ? (
                          <NFTImage 
                            src={nft.image} 
                            alt={nft.name}
                            tokenId={nft.tokenId}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiImage size={24} className="text-purple-600" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{nft.name}</h4>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{nft.description}</p>
                      <div className="text-xs text-pink-600">Token #{nft.tokenId}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiImage size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-2">No NFTs minted yet</p>
                  <p className="text-sm text-gray-400">Your minted NFTs will appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bridge Tab Content - COMMENTED OUT DUE TO FAILED IMPLEMENTATION */}
        {/* {activeTab === "bridge" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-600 rounded-full mb-6">
                  <FiLink
                    size={32}
                    className="text-white"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Cross-Chain Bridge
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Bridge your SUSD tokens between Sepolia and Base Sepolia
                  testnets
                </p>
              </div>

              <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Chain
                    </label>
                    <select
                      value={fromChain}
                      onChange={(e) => setFromChain(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="Sepolia">Sepolia Testnet</option>
                      <option value="Base Sepolia">Base Sepolia Testnet</option>
                    </select>
                    {account && (
                      <div className="mt-2">
                        <a
                          href={fromChain === "Sepolia" 
                            ? `https://sepolia.etherscan.io/address/${account.address}` 
                            : `https://sepolia.basescan.org/address/${account.address}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View on {fromChain === "Sepolia" ? "Sepolia Explorer" : "Base Sepolia Explorer"} ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        setFromChain(toChain);
                        setToChain(fromChain);
                      }}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                      ↕️
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Chain
                    </label>
                    <select
                      value={toChain}
                      onChange={(e) => setToChain(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="Base Sepolia">Base Sepolia Testnet</option>
                      <option value="Sepolia">Sepolia Testnet</option>
                    </select>
                    {account && (
                      <div className="mt-2">
                        <a
                          href={toChain === "Sepolia" 
                            ? `https://sepolia.etherscan.io/address/${account.address}` 
                            : `https://sepolia.basescan.org/address/${account.address}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View on {toChain === "Sepolia" ? "Sepolia Explorer" : "Base Sepolia Explorer"} ↗
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Enter SUSD amount"
                      value={bridgeAmount}
                      onChange={(e) => setBridgeAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="text-sm text-gray-600 text-center space-y-1">
                    <div>Estimated time: 10-15 minutes • Fee: FREE (Gasless!)</div>
                    {bridgeStats.bridgeCount > 0 && (
                      <div>Total bridges: {bridgeStats.bridgeCount} • Total bridged: {bridgeStats.totalBridged} SUSD</div>
                    )}
                    {bridgeCooldown > Date.now() && (
                      <div className="text-orange-600 font-medium">
                        Next bridge available in: {Math.ceil((bridgeCooldown - Date.now()) / 60000)} minutes
                      </div>
                    )}
                  </div>

                  <div className="relative group">
                    <motion.button
                      whileHover={{
                        scale:
                          isWalletConnected &&
                          bridgeAmount &&
                          fromChain !== toChain
                            ? 1.02
                            : 1,
                      }}
                      whileTap={{
                        scale:
                          isWalletConnected &&
                          bridgeAmount &&
                          fromChain !== toChain
                            ? 0.98
                            : 1,
                      }}
                      onClick={isWalletConnected ? handleBridge : undefined}
                      disabled={
                        !isWalletConnected ||
                        !bridgeAmount ||
                        fromChain === toChain ||
                        isBridgeLoading ||
                        bridgeCooldown > Date.now() ||
                        bridgeStats.isPaused
                      }
                      className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                      {isBridgeLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Bridging...
                        </div>
                      ) : bridgeCooldown > Date.now() ? (
                        `Cooldown Active (${Math.ceil((bridgeCooldown - Date.now()) / 60000)}m)`
                      ) : bridgeStats.isPaused ? (
                        "Bridge Paused"
                      ) : (
                        "Bridge Tokens"
                      )}
                    </motion.button>
                    {!isWalletConnected && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                          Connect Wallet to transact
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={() => openEducationModal("bridge")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo
                    className="mr-2"
                    size={16}
                  />
                  How do bridges work?
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bridge History
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">
                    500 SUSD: Sepolia → Base Sepolia
                  </span>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">
                    1000 SUSD: Base Sepolia → Sepolia
                  </span>
                  <span className="text-sm text-yellow-600">Pending</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">
                    250 SUSD: Sepolia → Base Sepolia
                  </span>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
              </div>
            </div>
          </motion.div>
        )} */}
      </div>

      {/* Educational Modal */}
      {isEducationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {getEducationContent().title}
                </h2>
                <button
                  onClick={() => setIsEducationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Main Explanation */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">
                    Main Explanation
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {getEducationContent().main}
                  </p>
                </div>

                {/* ELI5 Section */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                    Explain Like I&apos;m 5
                  </h3>
                  <p className="text-yellow-700 leading-relaxed">
                    {getEducationContent().eli5}
                  </p>
                </div>

                {/* Resources Section */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-600 mb-3">
                    Educational Resources
                  </h3>
                  <div className="space-y-2">
                    {getEducationContent().resources.map(
                      (resource: ResourceType, index: number) => (
                        <a
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="font-medium text-gray-900">
                            {resource.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {resource.description}
                          </div>
                        </a>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Transaction Success Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Transaction Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                Your transaction has been confirmed on Sepolia testnet
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500 mb-1">Transaction Hash:</p>
                <p className="text-xs font-mono text-gray-800 break-all">
                  {transactionHash}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors cursor-pointer">
                  Close
                </button>
                <button
                  onClick={() => {
                    window.open(
                      `https://sepolia.etherscan.io/tx/${transactionHash}`,
                      "_blank"
                    );
                    setShowTransactionModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  View on Explorer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* AI Bot Component */}
      <AiBot />
    </div>
  );
}
