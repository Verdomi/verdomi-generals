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
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer)
              mockDelegationRegistry = await ethers.getContract("MockDelegationRegistry", deployer)
              zeroAddress = "0x0000000000000000000000000000000000000000"
          })

          describe("Constructor", () => {
              it("Sets the aggregator addresses correctly", async () => {
                  const response = await minter.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("claimFreeMint", () => {
              it("Reverts if collection is not allowed to claim a free general.", async () => {
                  await expect(
                      minter.claimFreeMint(3, deployer.address, zeroAddress)
                  ).to.be.revertedWith("GeneralMinter__CollectionNotEligible")
              })
              it("Reverts if sender does not own the NFT.", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await expect(
                      minter.claimFreeMint(1, basicNft.address, zeroAddress)
                  ).to.be.revertedWith("GeneralMinter__NftBalanceTooLow")
              })
              it("Reverts if sender already has minted all free NFTs.", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)
                  await basicNft.mintNft()
                  await minter.claimFreeMint(3, basicNft.address, zeroAddress)
                  await expect(
                      minter.claimFreeMint(1, basicNft.address, zeroAddress)
                  ).to.be.revertedWith("GeneralMinter__AllPersonalFreeMintsClaimed")
              })
              it("Reverts if it causes over 1500 to be claimed for free.", async () => {
                  await minter.setMaxFreeClaims(1505)
                  await generals.addAllowed(minter.address)
                  await basicNft.mintNft()
                  await minter.addFreeMintCollection(basicNft.address)
                  await minter.claimFreeMint(5, basicNft.address, zeroAddress)
                  await expect(
                      minter.claimFreeMint(1500, basicNft.address, zeroAddress)
                  ).to.be.revertedWith("GeneralMinter__AllGeneralFreeMintsClaimed")
              })
              it("Reverts if using delegate but not delegated", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)
                  await expect(
                      minter.claimFreeMint(3, basicNft.address, player.address)
                  ).to.be.revertedWith("GeneralMinter__NotDelegated")
              })
              it("Reverts if delegated but vault does not own NFT", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)

                  const playerDR = mockDelegationRegistry.connect(player)
                  await playerDR.delegateForAll(deployer.address, true)

                  await expect(
                      minter.claimFreeMint(3, basicNft.address, player.address)
                  ).to.be.revertedWith("GeneralMinter__NftBalanceTooLow")
              })
              it("Successfully mints using delegate", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)

                  const playerDR = mockDelegationRegistry.connect(player)
                  await playerDR.delegateForAll(deployer.address, true)

                  const playerNFT = basicNft.connect(player)
                  await playerNFT.mintNft()

                  await minter.claimFreeMint(3, basicNft.address, player.address)
                  const balance = await generals.balanceOf(deployer.address)
                  assert.equal(balance.toString(), "3")
              })
              it("Successfully mints without delagate", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await generals.addAllowed(minter.address)
                  await basicNft.mintNft()
                  await minter.claimFreeMint(3, basicNft.address, zeroAddress)
                  const balance = await generals.balanceOf(deployer.address)
                  assert.equal(balance.toString(), "3")
              })
          })

          describe("setMaxFreeClaims", () => {
              it("Reverts if not owner.", async () => {
                  const playerMinter = minter.connect(player)
                  await expect(playerMinter.setMaxFreeClaims(3)).to.be.reverted
              })
              it("Sets the max free claims correctly", async () => {
                  const before = await minter.getMaxFreeClaims()
                  await minter.setMaxFreeClaims(20)
                  const after = await minter.getMaxFreeClaims()
                  assert.equal(before.toString(), "3")
                  assert.equal(after.toString(), "20")
              })
          })

          describe("mintGeneral", () => {
              it("Reverts if not enough funds.", async () => {
                  await generals.addAllowed(minter.address)
                  await expect(
                      minter.mintGeneral(5, { value: ethers.utils.parseEther("0.001") })
                  ).to.be.revertedWith("Insufficent amount of ETH.")
              })
              it("Mints if funds are correct.", async () => {
                  await generals.addAllowed(minter.address)
                  await minter.mintGeneral(5, { value: ethers.utils.parseEther("1") })
                  const balance = await generals.balanceOf(deployer.address)
                  assert.equal(balance.toString(), "5")
              })
              it("Refunds eth if too much.", async () => {
                  await generals.addAllowed(minter.address)
                  const amount = 1

                  const deployerBalanceBefore = await ethers.provider.getBalance(deployer.address)

                  const txResponse = await minter.mintGeneral(amount, {
                      value: ethers.utils.parseEther("1"),
                  })
                  const transactionReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await ethers.provider.getBalance(deployer.address)
                  const contractBalanceAfter = await ethers.provider.getBalance(minter.address)

                  const price = await minter.priceInEth()

                  assert(
                      deployerBalanceAfter.add(gasCost).toString() ==
                          deployerBalanceBefore.sub(price * amount).toString()
                  )
                  assert(contractBalanceAfter == price * amount)
              })
          })

          describe("remove Collections", () => {
              it("removes the collection", async () => {
                  await minter.addFreeMintCollection(basicNft.address)
                  await minter.removeFreeMintCollection(basicNft.address)
                  await expect(
                      minter.claimFreeMint(3, deployer.address, zeroAddress)
                  ).to.be.revertedWith("GeneralMinter__CollectionNotEligible")
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
