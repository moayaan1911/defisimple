// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {MockETH} from "src/MockETH.sol";

/**
 * @title Deploy MockETH
 * @dev Deployment script for MockETH token
 */
contract DeployMockETH is Script {
    function run() public returns (MockETH) {
        return deployContract();
    }

    function deployContract() public returns (MockETH) {
        vm.startBroadcast();
        MockETH mockETH = new MockETH();
        vm.stopBroadcast();
        return mockETH;
    }
}
