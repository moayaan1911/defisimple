// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {SimpleNFT} from "src/SimpleNFT.sol";

/**
 * @title Deploy SimpleNFT
 * @dev Deployment script for SimpleNFT collection
 */
contract DeploySimpleNFT is Script {
    function run() public returns (SimpleNFT) {
        return deployContract();
    }

    function deployContract() public returns (SimpleNFT) {
        vm.startBroadcast();
        SimpleNFT simpleNFT = new SimpleNFT();
        vm.stopBroadcast();
        return simpleNFT;
    }
}
