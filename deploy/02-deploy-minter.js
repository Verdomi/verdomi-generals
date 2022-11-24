const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log("------------------------")

    let ethUsdPriceFeedAddress
    let delegateAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
        const deleagte = await deployments.get("MockDelegationRegistry")
        delegateAddress = deleagte.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
        delegateAddress = "0x00000000000076A84feF008CDAbe6409d2FE638B"
    }

    const generals = await ethers.getContract("VerdomiGenerals")
    const args = [generals.address, ethUsdPriceFeedAddress, delegateAddress]
    const minter = await deploy("GeneralMinter", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(minter.address, args)
    }
    log("------------------------")
}

module.exports.tags = ["all", "minter", "main"]
