"use client";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { sepolia } from "thirdweb/chains";
import { client } from "@/lib/client";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
// Only Sepolia testnet supported
const supportedChains = [sepolia];

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "guest"],
    },
  }),
  createWallet("io.metamask"),
];

export default function ConnectWallet() {
  const account = useActiveAccount();
  const isConnected = !!account;

  return (
    <ConnectButton
      accountAbstraction={{
        chain: sepolia,
        sponsorGas: true,
      }}
      chains={supportedChains}
      client={client}
      connectButton={{ label: "Connect Wallet" }}
      connectModal={{
        showThirdwebBranding: false,
        size: "compact",
        title: "Connect to DeFiSimple",
      }}
      supportedTokens={{
        [sepolia.id]: [
          {
            address: CONTRACT_ADDRESSES.SIMPLE_USD,
            name: "SimpleUSD",
            symbol: "SUSD",
          },
          {
            address: CONTRACT_ADDRESSES.MOCK_ETH,
            name: "MockETH",
            symbol: "ETH",
          },
        ],
      }}
      theme={isConnected ? "light" : "dark"}
      wallets={wallets}
    />
  );
}
