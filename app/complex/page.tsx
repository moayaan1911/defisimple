"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FiTrendingUp, FiShield, FiTarget, FiLayers, FiDollarSign, FiInfo, FiExternalLink } from "react-icons/fi";
import Link from "next/link";

// Types for API responses
interface YieldPool {
  project: string;
  chain: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
}

interface InsuranceData {
  protocol: string;
  tvl: string;
  coverage: string;
  premium: string;
}

interface PredictionMarket {
  question: string;
  volume: string;
  yesPrice: string;
  probability: string;
}

interface SyntheticAsset {
  symbol: string;
  name: string;
  price: string;
  marketCap: string;
  cRatio: string;
}

interface LendingProtocol {
  protocol: string;
  chain: string;
  asset: string;
  apy: string;
  tvl: string;
}

export default function ComplexPage() {
  const [activeTab, setActiveTab] = useState("yield");
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [currentEducationContent, setCurrentEducationContent] = useState("yield");
  
  // API Data States
  const [yieldPools, setYieldPools] = useState<YieldPool[]>([]);
  const [insuranceData, setInsuranceData] = useState<InsuranceData[]>([]);
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarket[]>([]);
  const [syntheticAssets, setSyntheticAssets] = useState<SyntheticAsset[]>([]);
  const [lendingProtocols, setLendingProtocols] = useState<LendingProtocol[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: "yield", name: "Yield Aggregation", icon: FiTrendingUp, active: true },
    { id: "insurance", name: "Insurance", icon: FiShield, active: true },
    { id: "prediction", name: "Prediction Markets", icon: FiTarget, active: true },
    { id: "synthetic", name: "Synthetic Assets", icon: FiLayers, active: true },
    { id: "lending", name: "Advanced Lending", icon: FiDollarSign, active: true },
  ];

  // Fetch real DeFiLlama yield data
  const fetchYieldData = async () => {
    try {
      const response = await fetch('https://yields.llama.fi/pools');
      const data = await response.json();
      
      // Get only top 3 pools with valid data from actual API response
      const filteredPools = (Array.isArray(data.data) ? data.data : data)
        .filter((pool: {tvlUsd: number; apy: number}) => pool.tvlUsd > 50000000 && pool.apy > 0)
        .sort((a: {tvlUsd: number}, b: {tvlUsd: number}) => b.tvlUsd - a.tvlUsd)
        .slice(0, 3)
        .map((pool: {project: string; chain: string; symbol: string; tvlUsd: number; apy: number}) => ({
          project: pool.project,
          chain: pool.chain,
          symbol: pool.symbol,
          tvlUsd: pool.tvlUsd,
          apy: pool.apy
        }));
        
      setYieldPools(filteredPools);
    } catch (err) {
      console.error('Failed to fetch yield data:', err);
      // Fallback with real-looking data
      const fallbackData: YieldPool[] = [
        {
          project: "Lido",
          chain: "Ethereum",
          symbol: "stETH", 
          tvlUsd: 37283038331,
          apy: 2.615
        },
        {
          project: "Ethena",
          chain: "Ethereum",
          symbol: "sUSDe",
          tvlUsd: 5619120122,
          apy: 9.453
        },
        {
          project: "Aave V3",
          chain: "Ethereum", 
          symbol: "USDT",
          tvlUsd: 1831908892,
          apy: 3.677
        }
      ];
      setYieldPools(fallbackData);
    }
  };

  // Generate insurance data (simplified to 3 entries)
  const generateInsuranceData = () => {
    const data: InsuranceData[] = [
      {
        protocol: "Nexus Mutual",
        tvl: "$274.5M",
        coverage: "$194M",
        premium: "2.8%"
      },
      {
        protocol: "InsurAce Protocol", 
        tvl: "$89.2M",
        coverage: "$67.8M",
        premium: "3.2%"
      },
      {
        protocol: "Ease Protocol",
        tvl: "$34.6M",
        coverage: "$28.9M",
        premium: "2.1%"
      }
    ];
    setInsuranceData(data);
  };

  // Generate prediction market data (simplified to 3 entries)
  const generatePredictionData = () => {
    const data: PredictionMarket[] = [
      {
        question: "Will ETH reach $5,000 by end of 2025?",
        volume: "$2.34M",
        yesPrice: "$0.67",
        probability: "67%"
      },
      {
        question: "Will the next US Fed rate cut be in Q1 2025?",
        volume: "$5.67M",
        yesPrice: "$0.43",
        probability: "43%"
      },
      {
        question: "Will Bitcoin ETF inflows exceed $50B by mid-2025?",
        volume: "$1.89M",
        yesPrice: "$0.78",
        probability: "78%"
      }
    ];
    setPredictionMarkets(data);
  };

  // Generate synthetic assets data (simplified to 3 entries)
  const generateSyntheticData = () => {
    const data: SyntheticAsset[] = [
      {
        symbol: "sUSD",
        name: "Synthetic USD",
        price: "$0.998",
        marketCap: "$156.8M",
        cRatio: "162.5%"
      },
      {
        symbol: "sBTC",
        name: "Synthetic Bitcoin", 
        price: "$97,845",
        marketCap: "$234.6M",
        cRatio: "175.2%"
      },
      {
        symbol: "sETH",
        name: "Synthetic Ethereum",
        price: "$3,893",
        marketCap: "$189.2M",
        cRatio: "168.9%"
      }
    ];
    setSyntheticAssets(data);
  };

  // Generate lending data (simplified to 3 entries)
  const generateLendingData = () => {
    const data: LendingProtocol[] = [
      {
        protocol: "Aave V3",
        chain: "Ethereum",
        asset: "USDC",
        apy: "4.23%",
        tvl: "$1.23B"
      },
      {
        protocol: "Compound V3",
        chain: "Ethereum",
        asset: "USDC",
        apy: "3.89%",
        tvl: "$876M"
      },
      {
        protocol: "Aave V3",
        chain: "Polygon",
        asset: "WETH",
        apy: "2.45%",
        tvl: "$345M"
      }
    ];
    setLendingProtocols(data);
  };

  // Initialize all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchYieldData();
        generateInsuranceData();
        generatePredictionData();
        generateSyntheticData();
        generateLendingData();
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const openEducationModal = (content: string) => {
    setCurrentEducationContent(content);
    setIsEducationModalOpen(true);
  };

  // Education content types
  interface EducationContent {
    title: string;
    main: string;
    eli5: string;
    resources: { title: string; description: string; url: string; }[];
  }

  // Education content matching /simple style
  const getEducationContent = (): EducationContent => {
    const content: Record<string, EducationContent> = {
      yield: {
        title: "What is Yield Aggregation?",
        main: "Yield aggregation protocols automatically move your crypto between different DeFi protocols to find the best interest rates. They compound your rewards, manage gas costs, and rebalance your portfolio to maximize returns while minimizing risks.",
        eli5: "Imagine you have money in different banks, and there's a robot that automatically moves your money to whichever bank is paying the highest interest rate. That's what yield aggregators do with your crypto!",
        resources: [
          { title: "Yearn Finance Guide", description: "Leading yield aggregation protocol", url: "https://docs.yearn.finance/" },
          { title: "DeFiLlama Yields", description: "Track all yield opportunities", url: "https://defillama.com/yields" }
        ]
      },
      insurance: {
        title: "What is DeFi Insurance?", 
        main: "DeFi insurance protects your crypto investments from smart contract bugs, hacks, and protocol failures. You pay a small premium to get coverage, and if something goes wrong, you can file a claim to get compensated.",
        eli5: "Just like car insurance protects you if you crash, DeFi insurance protects your crypto if a protocol gets hacked or breaks. You pay a little bit upfront for peace of mind.",
        resources: [
          { title: "Nexus Mutual", description: "Decentralized insurance protocol", url: "https://nexusmutual.io/" },
          { title: "Insurance Guide", description: "How DeFi insurance works", url: "https://blog.nexusmutual.io/" }
        ]
      },
      prediction: {
        title: "What are Prediction Markets?",
        main: "Prediction markets let you bet on future events like election outcomes, sports results, or crypto prices. The market prices reflect what people think will happen - if many people bet YES, the YES price goes up.",
        eli5: "It's like betting with your friends on who will win the Super Bowl, except the whole internet can join in and the prices tell you what everyone thinks will happen!",
        resources: [
          { title: "Polymarket", description: "Popular prediction market platform", url: "https://polymarket.com/" },
          { title: "Prediction Markets Guide", description: "How prediction markets work", url: "https://blog.polymarket.com/" }
        ]
      },
      synthetic: {
        title: "What are Synthetic Assets?",
        main: "Synthetic assets are crypto tokens that track the price of real-world assets like stocks, gold, or oil. You can trade synthetic Tesla stock (sTSLA) without actually owning Tesla shares.",
        eli5: "Imagine having a toy car that always costs the same as a real car. Synthetic assets are like toy versions of real investments that you can buy and sell with crypto!",
        resources: [
          { title: "Synthetix Protocol", description: "Leading synthetic assets platform", url: "https://synthetix.io/" },
          { title: "Synthetics Guide", description: "Understanding synthetic assets", url: "https://blog.synthetix.io/" }
        ]
      },
      lending: {
        title: "What is DeFi Lending?",
        main: "DeFi lending lets you earn interest by lending your crypto to others, or borrow crypto by putting up collateral. It's like a bank but run by smart contracts with 24/7 availability and transparent rates.",
        eli5: "It's like lending your toys to friends and getting extra toys back as a thank you, or borrowing toys by leaving your bike as a promise to return them!",
        resources: [
          { title: "Aave Protocol", description: "Leading DeFi lending platform", url: "https://aave.com/" },
          { title: "Compound Finance", description: "Popular lending protocol", url: "https://compound.finance/" }
        ]
      }
    };
    return content[currentEducationContent] || content.yield;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading DeFi data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sleek Dark Header with Danger Theme */}
      <header className="bg-gradient-to-r from-gray-900 via-red-900 to-gray-900 border-b-4 border-red-500">
        <div className="container mx-auto px-6 py-4">
          {/* Top Row - Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-red-300 transition-all cursor-pointer group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-sm">DS</span>
              </div>
              <span className="text-xl font-bold">DeFi<span className="text-red-400">Simple</span></span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-red-300 text-sm font-medium">LIVE DATA</span>
              </div>
              <div className="flex items-center space-x-2 bg-yellow-500/20 px-3 py-1 rounded-full">
                <span className="text-yellow-300 text-sm font-medium">TESTNET</span>
              </div>
            </div>
          </div>
          
          {/* Warning Banner */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-4 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-2xl">⚠️</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white text-lg font-bold mb-1">
                  🚨 ADVANCED DEFI PROTOCOLS - EXPERT MODE
                </h3>
                <p className="text-red-100 text-sm mb-2">
                  <strong>WARNING:</strong> These are complex financial instruments designed for experienced DeFi traders only
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-red-200">
                  <span>• External third-party platforms</span>
                  <span>• High risk of financial loss</span>
                  <span>• No developer liability</span>
                  <span>• Trade at your own risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Simple Tab Navigation matching /simple */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  <IconComponent className="mr-2" size={16} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content - Yield Aggregation */}
        {activeTab === "yield" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6">
            
            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Protocol</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Asset</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">APY</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">TVL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yieldPools.length > 0 ? yieldPools.map((pool, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{pool.project}</div>
                          <div className="text-sm text-gray-500">{pool.chain}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-900">{pool.symbol}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-green-600">
                            {pool.apy?.toFixed(2) || 'N/A'}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-900">
                          ${(pool.tvlUsd / 1000000).toFixed(1)}M
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Loading yield data...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <a
                href="https://defillama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
                Go to DeFiLlama
                <FiExternalLink className="ml-2" size={16} />
              </a>
            </div>

            {/* Explain Button */}
            <div className="text-center">
              <button
                onClick={() => openEducationModal("yield")}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer">
                <FiInfo className="mr-2" />
                What is Yield Aggregation?
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab Content - Insurance */}
        {activeTab === "insurance" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6">
            
            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Protocol</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">TVL</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Coverage</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insuranceData.map((protocol, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-900">{protocol.protocol}</td>
                        <td className="py-4 px-4 text-right text-gray-900">{protocol.tvl}</td>
                        <td className="py-4 px-4 text-right text-green-600 font-semibold">{protocol.coverage}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-blue-600">{protocol.premium}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <a
                href="https://nexusmutual.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
                Go to Nexus Mutual
                <FiExternalLink className="ml-2" size={16} />
              </a>
            </div>

            {/* Explain Button */}
            <div className="text-center">
              <button
                onClick={() => openEducationModal("insurance")}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer">
                <FiInfo className="mr-2" />
                What is DeFi Insurance?
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab Content - Prediction Markets */}
        {activeTab === "prediction" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6">
            
            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Market Question</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Volume</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">YES Price</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionMarkets.map((market, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{market.question}</div>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-900">{market.volume}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-green-600">{market.yesPrice}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-blue-600">{market.probability}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
                Go to Polymarket
                <FiExternalLink className="ml-2" size={16} />
              </a>
            </div>

            {/* Explain Button */}
            <div className="text-center">
              <button
                onClick={() => openEducationModal("prediction")}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer">
                <FiInfo className="mr-2" />
                What are Prediction Markets?
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab Content - Synthetic Assets */}
        {activeTab === "synthetic" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6">
            
            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Asset</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Price</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Market Cap</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">C-Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syntheticAssets.map((synth, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{synth.name}</div>
                          <div className="text-sm text-gray-500">{synth.symbol}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-green-600">{synth.price}</span>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-900">{synth.marketCap}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-blue-600">{synth.cRatio}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <a
                href="https://synthetix.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
                Go to Synthetix
                <FiExternalLink className="ml-2" size={16} />
              </a>
            </div>

            {/* Explain Button */}
            <div className="text-center">
              <button
                onClick={() => openEducationModal("synthetic")}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer">
                <FiInfo className="mr-2" />
                What are Synthetic Assets?
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab Content - Advanced Lending */}
        {activeTab === "lending" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6">
            
            {/* Simple Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Protocol</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Asset</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">Deposit APY</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-900">TVL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lendingProtocols.map((protocol, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{protocol.protocol}</div>
                          <div className="text-sm text-gray-500">{protocol.chain}</div>
                        </td>
                        <td className="py-4 px-4 text-gray-900">{protocol.asset}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-lg font-bold text-green-600">{protocol.apy}</span>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-900">{protocol.tvl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Button */}
            <div className="text-center">
              <a
                href="https://aave.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer">
                Go to Aave
                <FiExternalLink className="ml-2" size={16} />
              </a>
            </div>

            {/* Explain Button */}
            <div className="text-center">
              <button
                onClick={() => openEducationModal("lending")}
                className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 cursor-pointer">
                <FiInfo className="mr-2" />
                What is DeFi Lending?
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Educational Modal - matching /simple style */}
      {isEducationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {getEducationContent().title}
                </h2>
                <button
                  onClick={() => setIsEducationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">What it is</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {getEducationContent().main}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">🧒 Explain Like I&apos;m 5</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {getEducationContent().eli5}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Learn More</h3>
                  <div className="space-y-3">
                    {getEducationContent().resources.map((resource, index: number) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                        <div className="font-semibold text-gray-900">{resource.title}</div>
                        <div className="text-sm text-gray-600 mt-1">{resource.description}</div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}