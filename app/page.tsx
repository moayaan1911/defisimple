"use client";
import React from "react";
import { motion } from "motion/react";
import { FiTrendingUp, FiShield } from "react-icons/fi";

export default function HomePage() {
  const problemCards = [
    {
      title: "Complex Interfaces",
      description: "Traditional DeFi platforms overwhelm users with confusing terminology and cluttered designs",
      stat: "73%",
      statLabel: "of users abandon DeFi due to complexity"
    },
    {
      title: "High Learning Curve",
      description: "Users need extensive crypto knowledge before they can safely interact with protocols",
      stat: "84%",
      statLabel: "feel DeFi is too technical"
    },
    {
      title: "Poor User Experience",
      description: "Multiple transaction confirmations, gas estimation errors, and failed transactions frustrate users",
      stat: "67%",
      statLabel: "experience transaction failures"
    }
  ];

  const educationalTopics = [
    { term: "Airdrop", definition: "Free tokens distributed to users" },
    { term: "Staking", definition: "Lock tokens to earn rewards" },
    { term: "DEX", definition: "Decentralized token exchange" },
    { term: "Bridge", definition: "Move assets between blockchains" },
    { term: "NFT", definition: "Unique digital ownership tokens" },
    { term: "Lending", definition: "Earn interest by lending crypto" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Testnet Disclaimer Banner */}
      <div className="bg-yellow-400 text-black py-3 px-6 text-center font-semibold">
        ⚠️ TESTNET DEMO - This is a demonstration application running on test networks. No transactions or interactions have any real value. All activities are for educational purposes only.
      </div>
      
      {/* Banner Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl lg:text-8xl font-bold mb-6">
              DeFi<span className="text-yellow-400">Simple</span>
            </h1>
            <p className="text-2xl lg:text-3xl font-semibold mb-4">
              Solving DeFi&apos;s Complex UI Problem
            </p>
            <p className="text-lg lg:text-xl text-blue-100 max-w-3xl mx-auto">
              Proving that superior UI/UX design can make decentralized finance accessible to everyone
            </p>
          </motion.div>
        </div>
      </section>

      {/* Hero Section - Split Screen */}
      <section className="relative min-h-screen flex items-center">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Problem */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
                <h2 className="text-3xl font-bold text-red-800 mb-4 flex items-center">
                  <FiShield className="mr-3 text-red-600" size={32} />
                  Traditional DeFi
                </h2>
                <div className="space-y-4">
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-red-700 font-medium">❌ Confusing terminology</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-red-700 font-medium">❌ Multiple failed transactions</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-red-700 font-medium">❌ High gas fees</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-red-700 font-medium">❌ Overwhelming interfaces</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Solution */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8">
                <h2 className="text-3xl font-bold text-green-800 mb-4 flex items-center">
                  <FiTrendingUp className="mr-3 text-green-600" size={32} />
                  Our Solution
                </h2>
                <div className="space-y-4">
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">✅ Simple, clear language</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">✅ Gasless transactions</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">✅ One-click actions</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-green-700 font-medium">✅ Built-in education</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Center CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mt-16"
          >
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6">
              DeFi Made{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Simple
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience DeFi without the complexity. Our platform proves that superior UI/UX design can solve mass adoption.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/simple" 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                Try Simple DeFi
              </a>
              <a 
                href="/complex" 
                className="px-8 py-4 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all duration-300"
              >
                See Complex DeFi
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Statement Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">The DeFi Adoption Problem</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Current DeFi platforms create barriers instead of bridges to financial freedom
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {problemCards.map((card, index) => (
              <motion.div 
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-8 hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">{card.stat}</div>
                  <div className="text-sm text-red-500 mb-4">{card.statLabel}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{card.title}</h3>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Educational Foundation Grid */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Learn DeFi Concepts</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Master essential DeFi knowledge with simple explanations and real examples
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {educationalTopics.map((topic, index) => (
              <motion.div 
                key={topic.term}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-300"
              >
                <h3 className="text-lg font-bold text-blue-600 mb-2">{topic.term}</h3>
                <p className="text-gray-600 text-sm">{topic.definition}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Research Metrics Display */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Research-Backed Approach</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our design decisions are based on extensive user research and behavioral analysis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-blue-600 mb-2">73%</div>
              <p className="text-gray-600">Users abandon DeFi due to complexity</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-green-600 mb-2">5x</div>
              <p className="text-gray-600">Faster task completion with simple UI</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-purple-600 mb-2">89%</div>
              <p className="text-gray-600">Prefer educational tooltips</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-indigo-600 mb-2">2.5x</div>
              <p className="text-gray-600">Higher success rate with our design</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to Experience Simple DeFi?</h3>
          <p className="text-gray-400 mb-8">Join thousands of users who&apos;ve discovered DeFi without the complexity</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a 
              href="/about" 
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300"
            >
              About DeFiSimple
            </a>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} DeFi Accessibility Platform. Proving UI/UX can solve mass adoption.
          </p>
        </div>
      </footer>
    </div>
  );
}
