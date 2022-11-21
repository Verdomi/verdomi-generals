const hre = require("hardhat")
const { LedgerSigner } = require("@ethersproject/hardware-wallets")
async function main() {
    let contractFactory = await hre.ethers.getContractFactory("VerdomiGenerals")
    const ledger = await new LedgerSigner(contractFactory.signer.provider, "hid", "m/44'/60'/0'/0")
    contractFactory = await contractFactory.connect(ledger)
    const melk = await contractFactory.deploy()
    await melk.deployed()
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
