// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {SimpleStake} from "src/SimpleStake.sol";
import {DevOpsTools} from "@foundry-devops/DevOpsTools.sol";

/**
 * @title Deploy SimpleStake
 * @dev Deployment script for SimpleStake staking contract
 */
contract DeploySimpleStake is Script {
    function run() public returns (SimpleStake) {
        return deployContract();
    }

    function deployContract() public returns (SimpleStake) {
        // Get the most recently deployed SimpleUSD contract address
        address simpleUSDAddress = DevOpsTools.get_most_recent_deployment("SimpleUSD", block.chainid);

        vm.startBroadcast();
        SimpleStake simpleStake = new SimpleStake(simpleUSDAddress);
        vm.stopBroadcast();
        return simpleStake;
    }
}
