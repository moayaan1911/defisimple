"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  FiGift,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiImage,
  FiLink,
  FiMessageCircle,
} from "react-icons/fi";
import Link from "next/link";
import ConnectWallet from "@/components/ConnectWallet";
import AIChat from "@/components/AIChat";
import { useActiveAccount } from "thirdweb/react";
import { readContract, sendTransaction, prepareContractCall } from "thirdweb";
import { simpleUSDContract, formatTokenAmount, CONTRACT_ADDRESSES } from "@/lib/contracts";

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
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
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
  const [swapRate] = useState(0.00025); // 1 SUSD = 0.00025 ETH (ETH at $4000)

  // Stake state
  const [stakeAmount, setStakeAmount] = useState("");
  const [stakedBalance] = useState(5000);
  const [earnedRewards] = useState(125.5);

  // Lend state
  const [lendAmount, setLendAmount] = useState("");
  const [lentBalance] = useState(2000);
  const [lendingEarned] = useState(80.25);

  // Mint state
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [mintedCount] = useState(3);

  // Bridge state
  const [bridgeAmount, setBridgeAmount] = useState("");
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Polygon");

  const tabs = [
    { id: "claim", name: "Claim", icon: FiGift, active: true },
    { id: "swap", name: "Swap", icon: FiRefreshCw, active: true },
    { id: "stake", name: "Stake", icon: FiTrendingUp, active: true },
    { id: "lend", name: "Lend", icon: FiDollarSign, active: true },
    { id: "mint", name: "Mint", icon: FiImage, active: true },
    { id: "bridge", name: "Bridge", icon: FiLink, active: true },
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

  const handleSwap = () => {
    if (!swapFromAmount) return;
    const dummyHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    showTransactionSuccess(dummyHash);
    setSwapFromAmount("");
  };

  const handleStake = () => {
    if (!stakeAmount) return;
    const dummyHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    showTransactionSuccess(dummyHash);
    setStakeAmount("");
  };

  const handleLend = () => {
    if (!lendAmount) return;
    const dummyHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    showTransactionSuccess(dummyHash);
    setLendAmount("");
  };

  const handleMint = () => {
    if (!nftName || !nftDescription) return;
    const dummyHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    showTransactionSuccess(dummyHash);
    setNftName("");
    setNftDescription("");
  };

  const handleBridge = () => {
    if (!bridgeAmount) return;
    const dummyHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    showTransactionSuccess(dummyHash);
    setBridgeAmount("");
  };

  const openEducationModal = (content: string) => {
    setCurrentEducationContent(content);
    setIsEducationModalOpen(true);
  };

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
      bridge: {
        title: "What are Cross-Chain Bridges?",
        main: "Cross-chain bridges allow you to move your cryptocurrency from one blockchain to another. Think of blockchains as different islands - bridges connect these islands so you can move your assets between them and access different features, lower fees, or faster transactions.",
        eli5: "Imagine you have toy cars that only work in your bedroom, but you want to play with them in the living room. A bridge is like a magic tunnel that can move your cars from your bedroom to the living room so you can play there too!",
        resources: [
          {
            title: "LayerZero Documentation",
            description: "Cross-chain interoperability protocol",
            url: "https://layerzero.gitbook.io/docs/",
          },
          {
            title: "Chainlink CCIP",
            description: "Cross-Chain Interoperability Protocol",
            url: "https://docs.chain.link/ccip",
          },
          {
            title: "Ethereum.org Bridges",
            description: "Official guide to blockchain bridges",
            url: "https://ethereum.org/en/bridges/",
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
                  <div className="px-12 py-4 bg-gray-400 text-white text-xl font-bold rounded-2xl cursor-not-allowed">
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
                        SUSD
                      </div>
                      <input
                        type="number"
                        placeholder="0.0"
                        value={swapFromAmount}
                        onChange={(e) => setSwapFromAmount(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                      ↓
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To
                    </label>
                    <div className="flex space-x-2">
                      <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium">
                        ETH
                      </div>
                      <input
                        type="text"
                        placeholder="0.0"
                        value={
                          swapFromAmount
                            ? (parseFloat(swapFromAmount) * swapRate).toFixed(6)
                            : ""
                        }
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 text-center">
                    Rate: 1 SUSD = {swapRate} ETH (ETH @ $4,000)
                  </div>

                  <div className="relative group">
                    <motion.button
                      whileHover={{
                        scale: isWalletConnected && swapFromAmount ? 1.02 : 1,
                      }}
                      whileTap={{
                        scale: isWalletConnected && swapFromAmount ? 0.98 : 1,
                      }}
                      onClick={isWalletConnected ? handleSwap : undefined}
                      disabled={!isWalletConnected || !swapFromAmount}
                      className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                      Swap SUSD to ETH
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
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">1000 SUSD → 0.25 ETH</span>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">500 SUSD → 0.125 ETH</span>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">250 SUSD → 0.0625 ETH</span>
                  <span className="text-sm text-green-600">Completed</span>
                </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Stake
                      </label>
                      <input
                        type="number"
                        placeholder="Enter SUSD amount"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated annual earnings:{" "}
                      {stakeAmount
                        ? (parseFloat(stakeAmount) * 0.12).toFixed(2)
                        : "0"}{" "}
                      SUSD
                    </div>
                    <div className="relative group">
                      <motion.button
                        whileHover={{
                          scale: isWalletConnected && stakeAmount ? 1.02 : 1,
                        }}
                        whileTap={{
                          scale: isWalletConnected && stakeAmount ? 0.98 : 1,
                        }}
                        onClick={isWalletConnected ? handleStake : undefined}
                        disabled={!isWalletConnected || !stakeAmount}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Stake SUSD
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
                        {earnedRewards} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">APY:</span>
                      <span className="font-semibold">12.0%</span>
                    </div>
                    <div className="relative group">
                      <button
                        disabled={!isWalletConnected}
                        className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Claim Rewards
                      </button>
                      {!isWalletConnected && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap">
                            Connect Wallet to transact
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="relative group">
                      <button
                        disabled={!isWalletConnected}
                        className="w-full py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Unstake All
                      </button>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount to Lend
                      </label>
                      <input
                        type="number"
                        placeholder="Enter SUSD amount"
                        value={lendAmount}
                        onChange={(e) => setLendAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      Estimated annual earnings:{" "}
                      {lendAmount
                        ? (parseFloat(lendAmount) * 0.08).toFixed(2)
                        : "0"}{" "}
                      SUSD
                    </div>
                    <div className="relative group">
                      <motion.button
                        whileHover={{
                          scale: isWalletConnected && lendAmount ? 1.02 : 1,
                        }}
                        whileTap={{
                          scale: isWalletConnected && lendAmount ? 0.98 : 1,
                        }}
                        onClick={isWalletConnected ? handleLend : undefined}
                        disabled={!isWalletConnected || !lendAmount}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Lend to Pool
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
                        {lendingEarned} SUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">APY:</span>
                      <span className="font-semibold">8.0%</span>
                    </div>
                    <div className="relative group">
                      <button
                        disabled={!isWalletConnected}
                        className="w-full py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Withdraw All
                      </button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">$2.5M</div>
                  <div className="text-sm text-gray-600">Total Pool Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">8.0%</div>
                  <div className="text-sm text-gray-600">Current APY</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">85%</div>
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
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-600 rounded-full mb-6">
                  <FiImage
                    size={32}
                    className="text-white"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Mint NFT
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Create your own NFT from the DeFi Learning Heroes collection
                </p>
              </div>

              <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NFT Name
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
                      Description
                    </label>
                    <textarea
                      placeholder="Describe your NFT"
                      value={nftDescription}
                      onChange={(e) => setNftDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div className="text-sm text-gray-600 text-center">
                    Gasless minting enabled • Free for testnet
                  </div>

                  <div className="relative group">
                    <motion.button
                      whileHover={{
                        scale:
                          isWalletConnected && nftName && nftDescription
                            ? 1.02
                            : 1,
                      }}
                      whileTap={{
                        scale:
                          isWalletConnected && nftName && nftDescription
                            ? 0.98
                            : 1,
                      }}
                      onClick={isWalletConnected ? handleMint : undefined}
                      disabled={
                        !isWalletConnected || !nftName || !nftDescription
                      }
                      className="w-full py-3 bg-pink-600 text-white font-bold rounded-lg hover:bg-pink-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                      Mint NFT
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
                  onClick={() => openEducationModal("mint")}
                  className="inline-flex items-center px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <FiInfo
                    className="mr-2"
                    size={16}
                  />
                  What are NFTs?
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Collection
              </h3>
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-pink-600 mb-2">
                  {mintedCount}
                </div>
                <div className="text-gray-600">NFTs Minted</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="aspect-square bg-gradient-to-br from-pink-200 to-purple-200 rounded-lg flex items-center justify-center">
                  <FiImage
                    size={24}
                    className="text-purple-600"
                  />
                </div>
                <div className="aspect-square bg-gradient-to-br from-blue-200 to-cyan-200 rounded-lg flex items-center justify-center">
                  <FiImage
                    size={24}
                    className="text-cyan-600"
                  />
                </div>
                <div className="aspect-square bg-gradient-to-br from-green-200 to-teal-200 rounded-lg flex items-center justify-center">
                  <FiImage
                    size={24}
                    className="text-teal-600"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bridge Tab Content */}
        {activeTab === "bridge" && (
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

                  <div className="text-sm text-gray-600 text-center">
                    Estimated time: 10-15 minutes • Bridge fee: ~0.001 ETH
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
                        fromChain === toChain
                      }
                      className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed">
                      Bridge Tokens
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
        )}
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

      {/* AI Chat Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAIChatOpen(true)}
        className="fixed bottom-6 right-6 w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 border-2 border-white cursor-pointer"
        title="Ask Thirdweb AI Assistant"
      >
        <FiMessageCircle size={32} />
      </motion.button>

      {/* AI Chat Modal */}
      <AIChat
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />
    </div>
  );
}
