// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {SimpleNFT} from "src/SimpleNFT.sol";
import {DevOpsTools} from "@foundry-devops/DevOpsTools.sol";

/**
 * @title Deploy SimpleNFT
 * @dev Deployment script for SimpleNFT collection contract
 */
contract DeploySimpleNFT is Script {
    function run() public returns (SimpleNFT) {
        return deployContract();
    }

    function deployContract() public returns (SimpleNFT) {
        address simpleUSDAddress;
        
        // Use known addresses for different chains
        if (block.chainid == 11155111) {
            // Sepolia testnet
            simpleUSDAddress = 0x57C33213aE6FE2fC0b9c5d74c475F1d496A66836;
        } else {
            // For other chains, try to use DevOpsTools
            simpleUSDAddress = DevOpsTools.get_most_recent_deployment("SimpleUSD", block.chainid);
        }

        vm.startBroadcast();
        SimpleNFT simpleNFT = new SimpleNFT(simpleUSDAddress);
        vm.stopBroadcast();
        return simpleNFT;
    }
}