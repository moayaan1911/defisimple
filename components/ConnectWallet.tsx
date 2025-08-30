"use client";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";

import { inAppWallet, createWallet } from "thirdweb/wallets";
import { sepolia } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId:
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "placeholder-client-id",
});
// Only Sepolia testnet supported
const supportedChains = [sepolia];

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "email", 
        "guest",
      ],
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
      theme={isConnected ? "light" : "dark"}
      wallets={wallets}
    />
  );
}
