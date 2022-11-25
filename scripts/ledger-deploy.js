const Web3 = require("web3")
const provider = require("eth-provider")

const { ethers } = require("hardhat")

async function main() {
    const ethProvider = require("eth-provider")
    const frame = ethProvider("frame") // Connect to Frame

    const factory = await ethers.getContractFactory("VerdomiGenerals")

    const args = []

    const tx = await factory.getDeployTransaction(args)
    console.log(tx)

    await frame.isConnected()

    tx.from = (await frame.request({ method: "eth_requestAccounts" }))[0]
    await frame.request({ method: "eth_sendTransaction", params: [tx] })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
