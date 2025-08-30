// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {SimpleLend} from "src/SimpleLend.sol";
import {DevOpsTools} from "@foundry-devops/DevOpsTools.sol";

/**
 * @title Deploy SimpleLend
 * @dev Deployment script for SimpleLend lending contract
 */
contract DeploySimpleLend is Script {
    function run() public returns (SimpleLend) {
        return deployContract();
    }

    function deployContract() public returns (SimpleLend) {
        // Get the most recently deployed SimpleUSD contract address
        address simpleUSDAddress = DevOpsTools.get_most_recent_deployment("SimpleUSD", block.chainid);

        vm.startBroadcast();
        SimpleLend simpleLend = new SimpleLend(simpleUSDAddress);
        vm.stopBroadcast();
        return simpleLend;
    }
}
