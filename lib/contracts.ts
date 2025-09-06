import { getContract } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { client } from "@/lib/client";
// Contract Addresses on Sepolia
export const CONTRACT_ADDRESSES = {
  SIMPLE_USD: "0x57C33213aE6FE2fC0b9c5d74c475F1d496A66836",
  MOCK_ETH: "0xE4a44C989Ca39AF437C5dE4ADbcF02BcAbdE0595",
  SIMPLE_SWAP: "0x0704aE35C1747D9d9dca59B143a362A6A95B8371",
  SIMPLE_NFT: "0xfffb02cBBea60824476e67E6CAA39E9dF15C49d2",
  SIMPLE_STAKE: "0x9F68f3E960033F61141E0C3ae199683DFe4a5e06",
  SIMPLE_LEND: "0xf7A37382D440d2E619E2bd88784B28c7F3f6bA10",
} as const;

// ABIs are optional with thirdweb - contracts work without them

// Contract instances
export const simpleUSDContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.SIMPLE_USD,
});

export const mockETHContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.MOCK_ETH,
});

export const simpleSwapContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.SIMPLE_SWAP,
});

export const simpleNFTContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.SIMPLE_NFT,
});

export const simpleStakeContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.SIMPLE_STAKE,
});

export const simpleLendContract = getContract({
  client,
  chain: sepolia,
  address: CONTRACT_ADDRESSES.SIMPLE_LEND,
});

// Helper functions
export const formatTokenAmount = (
  amount: bigint,
  decimals: number = 18
): string => {
  return (Number(amount) / Math.pow(10, decimals)).toFixed(2);
};

export const parseTokenAmount = (
  amount: string,
  decimals: number = 18
): bigint => {
  return BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
};
