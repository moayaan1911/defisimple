-include .env

clean  :; forge clean

# Remove modules
remove :; rm -rf .gitmodules && rm -rf .git/modules/* && rm -rf lib && touch .gitmodules && git add . && git commit -m "modules"

install :; forge install openzeppelin/openzeppelin-contracts && forge install smartcontractkit/chainlink-brownie-contracts && forge install cyfrin/foundry-devops && forge install foundry-rs/forge-std

# Update Dependencies
update:; forge update

build:; forge build

test-all :; forge test --match-path "test/**/*.sol" -vv

test-nft :; forge test --match-path "test/SimpleNFT.t.sol" -vv 


snapshot :; forge snapshot

format :; forge fmt

anvil :; anvil -m 'test test test test test test test test test test test junk' --steps-tracing --block-time 1

NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) --broadcast

ifeq ($(findstring --network sepolia,$(ARGS)),--network sepolia)
	NETWORK_ARGS := --rpc-url $(SEPOLIA_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --verify --etherscan-api-key $(ETHERSCAN_API_KEY) -vvvv
endif



# Deploy individual contracts
deploy-susd:
	@forge script script/SimpleUSD.s.sol:DeploySimpleUSD $(NETWORK_ARGS)

deploy-mocketh:
	@forge script script/MockETH.s.sol:DeployMockETH $(NETWORK_ARGS)

deploy-swap:
	@forge script script/SimpleSwap.s.sol:DeploySimpleSwap $(NETWORK_ARGS)

deploy-nft:
	@forge script script/SimpleNFT.s.sol:DeploySimpleNFT $(NETWORK_ARGS)

deploy-stake:
	@forge script script/SimpleStake.s.sol:DeploySimpleStake $(NETWORK_ARGS)

deploy-lend:
	@forge script script/SimpleLend.s.sol:DeploySimpleLend $(NETWORK_ARGS)

# Deploy all contracts in correct order
deploy-all:
	@echo "🚀 Deploying all contracts in order..."
	@forge script script/SimpleUSD.s.sol:DeploySimpleUSD $(NETWORK_ARGS)
	@echo "✅ SimpleUSD deployed"
	@forge script script/MockETH.s.sol:DeployMockETH $(NETWORK_ARGS)
	@echo "✅ MockETH deployed"
	@forge script script/SimpleSwap.s.sol:DeploySimpleSwap $(NETWORK_ARGS)
	@echo "✅ SimpleSwap deployed"
	@forge script script/SimpleNFT.s.sol:DeploySimpleNFT $(NETWORK_ARGS)
	@echo "✅ SimpleNFT deployed"
	@forge script script/SimpleStake.s.sol:DeploySimpleStake $(NETWORK_ARGS)
	@echo "✅ SimpleStake deployed"
	@forge script script/SimpleLend.s.sol:DeploySimpleLend $(NETWORK_ARGS)
	@echo "✅ SimpleLend deployed"
	@echo "🎉 All contracts deployed successfully!"

# Interaction commands (SHOULD HAVE BEEN THERE FROM DAY 1!)
add-liquidity:
	@echo "💧 Adding liquidity to SimpleSwap..."
	@forge script script/Interactions.s.sol:Interactions --sig "addLiquidity()" $(NETWORK_ARGS)

claim-susd:
	@echo "🎁 Claiming SUSD for owner..."
	@forge script script/Interactions.s.sol:Interactions --sig "claimSUSDForOwner()" $(NETWORK_ARGS)

test-swap:
	@echo "🔄 Testing swap functionality..."
	@forge script script/Interactions.s.sol:Interactions --sig "testSwap()" $(NETWORK_ARGS)

setup-all:
	@echo "🚀 Running full setup (claim + liquidity + test)..."
	@forge script script/Interactions.s.sol:Interactions --sig "runFullSetup()" $(NETWORK_ARGS)

# Legacy deploy command (defaults to SimpleUSD)
deploy: deploy-susd

