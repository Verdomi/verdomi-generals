const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Minter Unit Tests", function () {
          let minter, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["all"])
              minter = await ethers.getContract("GeneralMinter")
              basicNft = await ethers.getContract("BasicNft")
              generals = await ethers.getContract("VerdomiGenerals")
          })

          describe("Price", () => {
              it("Initilizes the price correctly", async () => {
                  const price = await minter.price()
                  assert.equal(price.toString(), ethers.utils.parseEther("0.01").toString())
              })
          })

          describe("claimFreeMint", () => {
              it("Reverts if collection is not allowed to claim a free general.", async () => {
                  await expect(minter.claimFreeMint(3, deployer.address)).to.be.revertedWith(
                      "GeneralMinter__CollectionNotEligible"
                  )
              })
              it("Reverts if sender does not own the NFT.", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await expect(minter.claimFreeMint(1, basicNft.address)).to.be.revertedWith(
                      "GeneralMinter__NftBalanceTooLow"
                  )
              })
              it("Reverts if sender already has minted all free NFTs.", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)
                  await basicNft.mintNft()
                  await minter.claimFreeMint(3, basicNft.address)
                  await expect(minter.claimFreeMint(1, basicNft.address)).to.be.revertedWith(
                      "GeneralMinter__AllPersonalFreeMintsClaimed"
                  )
              })
          })

          describe("mintGeneral", () => {
              it("Reverts if not enough funds.", async () => {
                  await generals.addAllowed(minter.address)
                  await expect(
                      minter.mintGeneral(5, { value: ethers.utils.parseEther("0.01") })
                  ).to.be.revertedWith("GeneralMinter__NotEnoughFunds")
              })
              it("Mints if funds are correct.", async () => {
                  await generals.addAllowed(minter.address)
                  await minter.mintGeneral(5, { value: ethers.utils.parseEther("0.05") })
                  const balance = await generals.balanceOf(deployer.address)
                  assert.equal(balance.toString(), "5")
              })
          })

          describe("remove Collections", () => {
              it("removes the collection", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await minter.removeFreeMintCollection(basicNft.address)
                  await expect(minter.claimFreeMint(3, deployer.address)).to.be.revertedWith(
                      "GeneralMinter__CollectionNotEligible"
                  )
              })
              it("Reverts if not owner", async () => {
                  const playerMinter = minter.connect(player)
                  await expect(playerMinter.addFreeMintCollection(basicNft.address)).to.be.reverted
                  await expect(playerMinter.removeFreeMintCollection(basicNft.address)).to.be
                      .reverted
              })
          })

          describe("withdrawFunds", () => {
              it("Sends the money to the caller.", async () => {
                  const deployerBalanceBefore = await ethers.provider.getBalance(deployer.address)
                  const contractBalanceBefore = await ethers.provider.getBalance(minter.address)
                  const txResponse = await minter.withdrawFunds()
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await ethers.provider.getBalance(deployer.address)
                  const contractBalanceAfter = await ethers.provider.getBalance(minter.address)
                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          contractBalanceBefore.add(deployerBalanceBefore).toString()
                  )
                  assert(contractBalanceAfter == 0)
              })
              it("Reverts if not owner.", async () => {
                  const playerMinter = minter.connect(player)
                  await expect(playerMinter.withdrawFunds()).to.be.reverted
              })
          })
      })

/*




*/
