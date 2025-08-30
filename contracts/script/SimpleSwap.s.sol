// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {SimpleSwap} from "src/SimpleSwap.sol";
import {DevOpsTools} from "@foundry-devops/DevOpsTools.sol";

/**
 * @title Deploy SimpleSwap
 * @dev Deployment script for SimpleSwap contract
 * @notice Deploys SimpleSwap with existing token addresses from DevOpsTools
 */
contract DeploySimpleSwap is Script {
    function run() public returns (SimpleSwap) {
        return deployContract();
    }

    function deployContract() public returns (SimpleSwap) {
        // Get the most recently deployed SimpleUSD and MockETH contract addresses
        address simpleUSDAddress = DevOpsTools.get_most_recent_deployment("SimpleUSD", block.chainid);
        address mockETHAddress = DevOpsTools.get_most_recent_deployment("MockETH", block.chainid);

        vm.startBroadcast();

        // Deploy SimpleSwap contract with existing token addresses
        SimpleSwap simpleSwap = new SimpleSwap(simpleUSDAddress, mockETHAddress);

        vm.stopBroadcast();

        return simpleSwap;
    }
}
