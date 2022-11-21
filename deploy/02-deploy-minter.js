const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    log("------------------------")
    const generals = await ethers.getContract("VerdomiGenerals")
    const args = [generals.address]
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
