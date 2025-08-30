"use client";
import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  FiSearch,
  FiTarget,
  FiCode,
  FiGithub,
  FiLinkedin,
  FiMail,
} from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";

// Comprehensive crypto glossary with 50+ detailed explanations
const cryptoTerms = [
  {
    term: "Airdrop",
    definition:
      "Free distribution of cryptocurrency tokens to wallet addresses, usually as a marketing strategy or reward for early supporters.",
    eli5: "Imagine a company throwing free money from helicopters to people below. That's an airdrop - crypto projects giving away free coins to users!",
  },
  {
    term: "Altcoin",
    definition:
      "Any cryptocurrency other than Bitcoin. The term is derived from 'alternative coin' and includes thousands of different cryptocurrencies.",
    eli5: "If Bitcoin is like the original Pokemon card, altcoins are all the other different Pokemon cards that came after it.",
  },
  {
    term: "AMM",
    definition:
      "Automated Market Maker - a type of decentralized exchange protocol that uses mathematical formulas to price assets instead of traditional order books.",
    eli5: "Like a vending machine that automatically figures out fair prices for trading coins without needing a human to set the prices.",
  },
  {
    term: "APY",
    definition:
      "Annual Percentage Yield - the real rate of return earned on an investment, taking into account the effect of compounding interest.",
    eli5: "How much extra money you'll have after one year if you let your money grow in a special savings account that gives you more money over time.",
  },
  {
    term: "Bear Market",
    definition:
      "A market condition where prices are falling or are expected to fall, typically characterized by widespread pessimism and declining investor confidence.",
    eli5: "When everyone is sad and scared about crypto prices going down, like when it's raining and everyone stays inside.",
  },
  {
    term: "Bitcoin",
    definition:
      "The first and most well-known cryptocurrency, created in 2009 by an anonymous person or group known as Satoshi Nakamoto.",
    eli5: "The first and most famous digital money ever created, like the grandfather of all cryptocurrencies.",
  },
  {
    term: "Blockchain",
    definition:
      "A decentralized, distributed ledger technology that maintains a continuously growing list of records, linked and secured using cryptography.",
    eli5: "Think of a notebook that everyone in class has an identical copy of. When someone writes something new, everyone updates their notebook.",
  },
  {
    term: "Bridge",
    definition:
      "A protocol that allows users to transfer assets from one blockchain to another, enabling interoperability between different blockchain networks.",
    eli5: "Like a magical bridge that lets you take your toys from one playground to another playground so you can play with them anywhere.",
  },
  {
    term: "Bull Market",
    definition:
      "A market condition where prices are rising or are expected to rise, characterized by optimism and increasing investor confidence.",
    eli5: "When everyone is happy and excited about crypto prices going up, like when the sun is shining and everyone wants to play outside.",
  },
  {
    term: "Centralized Exchange",
    definition:
      "A cryptocurrency exchange that is operated by a company and acts as an intermediary between buyers and sellers, holding custody of users' funds.",
    eli5: "Like a big store where you can buy and sell crypto coins, but the store holds your money for you like a bank.",
  },
  {
    term: "Cold Wallet",
    definition:
      "A cryptocurrency wallet that is not connected to the internet, providing enhanced security for long-term storage of digital assets.",
    eli5: "Like keeping your most valuable toys in a safe deposit box that's not connected to the internet, so hackers can't steal them.",
  },
  {
    term: "DAO",
    definition:
      "Decentralized Autonomous Organization - an organization governed by smart contracts and token holders, without centralized management.",
    eli5: "Like a club where everyone votes on decisions and the rules are automatic, with no single boss telling everyone what to do.",
  },
  {
    term: "DApp",
    definition:
      "Decentralized Application - an application that runs on a decentralized network, typically using blockchain technology and smart contracts.",
    eli5: "Apps that work like regular phone apps, but instead of being controlled by one company, they're controlled by everyone using them.",
  },
  {
    term: "DeFi",
    definition:
      "Decentralized Finance - financial services built on blockchain technology that operate without traditional intermediaries like banks.",
    eli5: "Imagine if you could borrow, lend, and trade money without going to a bank. DeFi lets you do banking stuff directly with other people.",
  },
  {
    term: "Diamond Hands",
    definition:
      "A term used to describe investors who hold their cryptocurrency investments for long periods despite market volatility.",
    eli5: "When someone holds their crypto so tight and never sells, even when prices go crazy up and down, like having hands made of diamonds.",
  },
  {
    term: "Ethereum",
    definition:
      "A blockchain platform that enables smart contracts and decentralized applications to be built and run without downtime or third-party interference.",
    eli5: "Like a giant computer that everyone in the world shares, where you can run programs that no single person controls.",
  },
  {
    term: "Flash Loan",
    definition:
      "A type of loan in DeFi that must be borrowed and repaid within the same transaction, with no collateral required.",
    eli5: "Like borrowing your friend's bike, using it to deliver newspapers for money, then giving the bike back all in the same minute.",
  },
  {
    term: "Fork",
    definition:
      "A change to a blockchain's protocol that makes previously invalid blocks/transactions valid, or creates a new version of the blockchain.",
    eli5: "When everyone playing a game decides to change the rules, or split into two different games with different rules.",
  },
  {
    term: "FUD",
    definition:
      "Fear, Uncertainty, and Doubt - negative information spread to influence perception and cause panic selling in cryptocurrency markets.",
    eli5: "When people spread scary stories about crypto to make others afraid and sell their coins, like spreading rumors in school.",
  },
  {
    term: "Gas",
    definition:
      "The fee required to conduct a transaction or execute a contract on the Ethereum blockchain, paid in Ether (ETH).",
    eli5: "Like paying for gas in your car to drive somewhere. You need to pay 'gas' fees to make transactions on Ethereum.",
  },
  {
    term: "Genesis Block",
    definition:
      "The first block in a blockchain, serving as the foundation for all subsequent blocks in the chain.",
    eli5: "The very first building block that starts a blockchain, like the first domino in a long line of dominos.",
  },
  {
    term: "Governance Token",
    definition:
      "A type of cryptocurrency that gives holders the right to vote on decisions regarding the development and operation of a blockchain project.",
    eli5: "Special coins that let you vote on how a crypto project should work, like being able to vote on what games to play at recess.",
  },
  {
    term: "Hardware Wallet",
    definition:
      "A physical device that stores cryptocurrency private keys offline, providing enhanced security for digital asset storage.",
    eli5: "A special USB stick that keeps your crypto safe by storing it away from the internet, like a tiny safe for your digital money.",
  },
  {
    term: "Hash",
    definition:
      "A mathematical function that converts input data into a fixed-length string of characters, used for securing blockchain transactions.",
    eli5: "Like a secret code maker that turns any message into a scrambled code that always looks the same length, no matter how long the original message was.",
  },
  {
    term: "HODL",
    definition:
      "A misspelling of 'hold' that became a meme, meaning to hold onto cryptocurrency long-term despite market volatility.",
    eli5: "Someone typed 'hold' wrong as 'hodl' and now it means 'keep your crypto no matter what happens to the price!'",
  },
  {
    term: "Hot Wallet",
    definition:
      "A cryptocurrency wallet that is connected to the internet, allowing for easy access and transactions but with increased security risks.",
    eli5: "A wallet for your crypto that's always connected to the internet, making it easy to spend but easier for bad guys to try to steal from.",
  },
  {
    term: "ICO",
    definition:
      "Initial Coin Offering - a fundraising method where new projects sell their cryptocurrency tokens to early supporters in exchange for funding.",
    eli5: "Like a lemonade stand asking neighbors to give them money upfront in exchange for special lemonade tickets they can use later.",
  },
  {
    term: "Impermanent Loss",
    definition:
      "A temporary loss of funds experienced by liquidity providers in AMM pools due to volatility in trading pairs.",
    eli5: "When you lend your toys to a toy-sharing club, sometimes you might get back fewer toys than you put in if the toy values change.",
  },
  {
    term: "Layer 2",
    definition:
      "Secondary protocols built on top of existing blockchains to improve scalability and reduce transaction costs.",
    eli5: "Like building a faster highway on top of an existing road to help more cars travel faster and cheaper.",
  },
  {
    term: "Liquidity",
    definition:
      "The ease with which an asset can be converted into cash or other assets without affecting its market price significantly.",
    eli5: "How quickly you can sell something without changing its price. Like selling lemonade - if lots of people want it, you have good liquidity!",
  },
  {
    term: "Liquidity Pool",
    definition:
      "A crowdsourced pool of cryptocurrencies locked in smart contracts to facilitate trading on decentralized exchanges.",
    eli5: "Like a big shared piggy bank where everyone puts in their coins so others can trade, and everyone gets a small reward for sharing.",
  },
  {
    term: "Market Cap",
    definition:
      "The total value of a cryptocurrency, calculated by multiplying the current price by the total number of coins in circulation.",
    eli5: "How much all the coins of one type would be worth if you added up their prices, like counting the total value of all Pokemon cards in the world.",
  },
  {
    term: "Metamask",
    definition:
      "A popular cryptocurrency wallet browser extension that allows users to interact with Ethereum-based decentralized applications.",
    eli5: "A digital wallet app that lives in your web browser, like having a purse built right into your computer screen.",
  },
  {
    term: "Mining",
    definition:
      "The process of validating transactions and adding them to the blockchain ledger in exchange for cryptocurrency rewards.",
    eli5: "Like being a detective who solves math puzzles to verify that transactions are real, and getting paid in crypto for being right.",
  },
  {
    term: "Multisig",
    definition:
      "Multi-signature wallet that requires multiple private keys to authorize a cryptocurrency transaction, enhancing security.",
    eli5: "Like a treasure chest that needs multiple keys from different people to open, so no single person can take all the treasure.",
  },
  {
    term: "NFT",
    definition:
      "Non-Fungible Token - a unique digital certificate of ownership for a specific digital or physical asset, stored on a blockchain.",
    eli5: "Like a special certificate that proves you own a unique digital trading card that no one else can copy or fake.",
  },
  {
    term: "Node",
    definition:
      "A computer that participates in a blockchain network by maintaining a copy of the blockchain and validating transactions.",
    eli5: "Like having a copy of the classroom notebook at home, helping to keep track of everything that happens in the crypto network.",
  },
  {
    term: "Oracle",
    definition:
      "A service that provides real-world data to blockchain networks, enabling smart contracts to interact with external information.",
    eli5: "Like a messenger who tells the blockchain what's happening in the real world, like weather or sports scores.",
  },
  {
    term: "Paper Hands",
    definition:
      "A term describing investors who sell their cryptocurrency quickly at the first sign of price decline or volatility.",
    eli5: "When someone gets scared and sells their crypto coins very quickly when prices go down, like having hands made of weak paper.",
  },
  {
    term: "Private Key",
    definition:
      "A secret cryptographic key that allows cryptocurrency to be spent, providing mathematical proof that transactions came from the wallet owner.",
    eli5: "Like the secret password to your piggy bank. If someone knows it, they can take all your money, so keep it super secret!",
  },
  {
    term: "Proof of Stake",
    definition:
      "A consensus mechanism where validators are chosen to create new blocks based on the amount of cryptocurrency they hold and stake.",
    eli5: "A way to choose who gets to add new pages to the blockchain notebook by seeing who has the most coins locked up as a promise to be honest.",
  },
  {
    term: "Proof of Work",
    definition:
      "A consensus mechanism that requires miners to solve complex mathematical problems to validate transactions and create new blocks.",
    eli5: "A way to choose who gets to add new pages to the blockchain notebook by making everyone solve really hard math puzzles first.",
  },
  {
    term: "Pump and Dump",
    definition:
      "A form of market manipulation where the price of an asset is artificially inflated then sold off, causing rapid price decline.",
    eli5: "When bad people trick others into buying something by making it seem valuable, then sell everything quickly, making the price crash.",
  },
  {
    term: "Rug Pull",
    definition:
      "A type of exit scam where developers abandon a project and run away with investors' funds, often in DeFi projects.",
    eli5: "When someone builds a lemonade stand, takes everyone's money, then runs away and never sells any lemonade. Very mean!",
  },
  {
    term: "Satoshi",
    definition:
      "The smallest unit of Bitcoin, equal to 0.00000001 BTC, named after Bitcoin's creator Satoshi Nakamoto.",
    eli5: "The tiniest piece of Bitcoin you can have, like a penny is the smallest piece of a dollar, but much much smaller.",
  },
  {
    term: "Smart Contract",
    definition:
      "Self-executing contracts with terms directly written into code, automatically enforcing agreements without intermediaries.",
    eli5: "Like a robot contract that automatically does what it promises when certain conditions are met, without needing humans to enforce it.",
  },
  {
    term: "Stablecoin",
    definition:
      "A type of cryptocurrency designed to maintain a stable value relative to a reference asset, usually the US dollar.",
    eli5: "Crypto coins that try to always cost the same amount, like $1, so their price doesn't go up and down like a roller coaster.",
  },
  {
    term: "Staking",
    definition:
      "The process of holding cryptocurrency in a wallet to support network operations and earn rewards, similar to earning interest.",
    eli5: "Like putting your money in a special piggy bank that helps keep the crypto network safe, and the bank gives you extra coins as a thank you.",
  },
  {
    term: "Token",
    definition:
      "A digital unit of value built on an existing blockchain, representing various assets or utilities within a specific ecosystem.",
    eli5: "Like special coins or tickets you can use in a specific game or store, but they're made of computer code instead of metal or paper.",
  },
  {
    term: "TVL",
    definition:
      "Total Value Locked - the total amount of assets deposited in a DeFi protocol, used as a metric to measure the protocol's size and success.",
    eli5: "How much money in total everyone has put into a DeFi app, like counting all the money in all the piggy banks in a classroom.",
  },
  {
    term: "Validator",
    definition:
      "A network participant responsible for verifying transactions and maintaining blockchain security in proof-of-stake systems.",
    eli5: "Like a security guard who checks everyone's tickets to make sure they're real before letting them into the crypto concert.",
  },
  {
    term: "Volatility",
    definition:
      "The degree of variation in the price of a cryptocurrency over time, indicating how much and how quickly prices change.",
    eli5: "How much the price of crypto goes up and down, like a roller coaster that sometimes goes really high and sometimes goes really low.",
  },
  {
    term: "Wallet",
    definition:
      "A digital tool that allows users to store, send, and receive cryptocurrencies, containing public and private key pairs.",
    eli5: "Your digital purse that holds your crypto coins. It has an address so people can send you money, like a mailbox for digital coins.",
  },
  {
    term: "Whale",
    definition:
      "An individual or entity that holds a large amount of cryptocurrency, capable of influencing market prices through their trading actions.",
    eli5: "Someone who has so much crypto that when they buy or sell, it's like a huge whale splashing in a pool - everyone else feels the waves.",
  },
  {
    term: "Yield Farming",
    definition:
      "The practice of lending or staking cryptocurrency to generate high returns or rewards in the form of additional cryptocurrency.",
    eli5: "Like planting magic seeds (your crypto) in different gardens (protocols) to grow more seeds, always looking for the best growing spots.",
  },
];

interface GlossaryTerm {
  term: string;
  definition: string;
  eli5: string;
}

export default function AboutPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter and sort terms alphabetically
  const filteredTerms = useMemo(() => {
    return cryptoTerms
      .filter(
        (term) =>
          term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          term.definition.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery]);

  const openTermModal = (term: GlossaryTerm) => {
    setSelectedTerm(term);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTerm(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors">
            <span className="text-2xl font-bold">
              DeFi<span className="text-purple-600">Simple</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Developer Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">About DeFiSimple</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Proving that superior UI/UX design can solve DeFi&apos;s mass
              adoption problem
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Developer Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden mr-4">
                  <Image
                    src="https://gateway.lighthouse.storage/ipfs/bafybeidlpfu7vy2rgevvo2msiebtvjfjtejlgjsgjja4jixly45sq3woii/profile.jpeg"
                    alt="Mohammad Ayaan Siddiqui"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Mohammad Ayaan Siddiqui
                  </h2>
                  <p className="text-blue-200">DeFi MAXI</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <FiCode
                    className="mr-3 text-blue-300"
                    size={20}
                  />
                  <span>Full Stack Blockchain Developer</span>
                </div>
                <div className="flex items-center">
                  <FiTarget
                    className="mr-3 text-green-300"
                    size={20}
                  />
                  <span>Crypto Investor</span>
                </div>
                <div className="flex items-center">
                  <FiTarget
                    className="mr-3 text-yellow-300"
                    size={20}
                  />
                  <span>MBA Graduate</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <a
                  href="https://moayaan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <FiCode size={20} />
                </a>
                <a
                  href="https://github.com/moayaan1911"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <FiGithub size={20} />
                </a>
                <a
                  href="https://www.linkedin.com/in/ayaaneth/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <FiLinkedin size={20} />
                </a>
                <a
                  href="mailto:moayaan.eth@gmail.com"
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <FiMail size={20} />
                </a>
              </div>
            </motion.div>

            {/* Project Mission */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3 flex items-center">
                  <FiTarget className="mr-2" />
                  Project Mission
                </h3>
                <p className="text-blue-100 leading-relaxed">
                  To demonstrate that DeFi&apos;s complexity problem isn&apos;t
                  technical—it&apos;s a user experience problem. This platform
                  proves the same protocols can be simple and accessible with
                  better design.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">The Problem</h3>
                <p className="text-blue-100 leading-relaxed">
                  73% of users abandon DeFi due to complexity. Traditional
                  platforms overwhelm users with technical jargon, confusing
                  interfaces, and poor user flows.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-3">The Solution</h3>
                <p className="text-blue-100 leading-relaxed">
                  Same powerful DeFi protocols, reimagined with human-centered
                  design. Compare our /simple and /complex routes to see the
                  difference UI makes.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Crypto Glossary Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Crypto Glossary
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Search and explore comprehensive explanations of crypto and DeFi
              terms
            </p>

            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <FiSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search crypto terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </motion.div>

          {/* Glossary Terms Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredTerms.map((term, index) => (
              <motion.div
                key={term.term}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => openTermModal(term)}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-blue-300 hover:scale-105 text-center">
                <h4 className="font-bold text-gray-900 text-sm">{term.term}</h4>
              </motion.div>
            ))}
          </motion.div>

          {filteredTerms.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No terms found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Term Modal */}
      {isModalOpen && selectedTerm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedTerm.term}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Definition
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedTerm.definition}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                    🧒 Explain Like I&apos;m 5
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {selectedTerm.eli5}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold mb-4">
            Ready to Experience the Difference?
          </h3>
          <p className="text-gray-400 mb-8">
            Compare simple vs complex DeFi interfaces
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/simple"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl transition-all duration-300">
              Try Simple DeFi
            </Link>
            <Link
              href="/complex"
              className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-300">
              See Complex DeFi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
