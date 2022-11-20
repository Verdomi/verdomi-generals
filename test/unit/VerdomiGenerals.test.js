const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Generals Unit Tests", function () {
          let generals, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["generals"])
              generals = await ethers.getContract("VerdomiGenerals")
          })

          describe("Construtor", () => {
              it("Initilizes the NFT Correctly.", async () => {
                  const name = await generals.name()
                  const symbol = await generals.symbol()
                  assert.equal(name, "Verdomi Generals")
                  assert.equal(symbol, "VGEN")
              })
          })

          describe("MintGeneral", () => {
              it("Reverts if not allowed.", async () => {
                  await expect(generals.mintGeneral(deployer.address, 1)).to.be.revertedWith(
                      "AllowedAddresses: caller is not allowed"
                  )
              })
              it("Reverts if amount exceeds max supply.", async () => {
                  await generals.addAllowed(deployer.address)
                  const maxSupply = await generals.maxSupply()
                  assert.equal(maxSupply.toString(), "2000")
                  await generals.mintGeneral(deployer.address, maxSupply)
                  await expect(generals.mintGeneral(deployer.address, 1)).to.be.revertedWith(
                      "VerdomiGenerals__ExceedsMaxSupply"
                  )
              })
              it("Mints the correct amount of NFTs.", async () => {
                  await generals.addAllowed(deployer.address)
                  await generals.mintGeneral(deployer.address, 11)
                  const balance = await generals.balanceOf(deployer.address)
                  const total = await generals.totalSupply()
                  assert.equal(balance.toString(), "11")
                  assert.equal(total.toString(), "11")
              })
          })

          describe("NextStage", () => {
              it("Reverts if not owner.", async () => {
                  const playerConnectedGenerals = generals.connect(player)
                  await expect(playerConnectedGenerals.nextStage()).to.be.reverted
              })
              it("Increases the maxSupply.", async () => {
                  const stage1 = await generals.maxSupply()
                  await generals.nextStage()
                  const stage2 = await generals.maxSupply()
                  await generals.nextStage()
                  const stage3 = await generals.maxSupply()
                  await generals.nextStage()
                  const stage4 = await generals.maxSupply()
                  await generals.nextStage()
                  const stage5 = await generals.maxSupply()

                  assert.equal(stage1.toString(), "2000")
                  assert.equal(stage2.toString(), "4000")
                  assert.equal(stage3.toString(), "6000")
                  assert.equal(stage4.toString(), "8000")
                  assert.equal(stage5.toString(), "10000")
              })
              it("Reverts if stage 5 has been reached.", async () => {
                  await generals.nextStage()
                  await generals.nextStage()
                  await generals.nextStage()
                  await generals.nextStage()
                  await expect(generals.nextStage()).to.be.revertedWith("VerdomiGenerals__MaxStage")
              })
          })

          describe("setBaseURI", () => {
              it("Reverts if not owner.", async () => {
                  const playerConnectedGenerals = generals.connect(player)
                  await expect(playerConnectedGenerals.setBaseURI("hello")).to.be.reverted
              })
              it("Reverts if BaseUri is frozen.", async () => {
                  await generals.setBaseURI("hello")
                  await generals.nextStage()
                  await generals.nextStage()
                  await generals.nextStage()
                  await generals.nextStage()
                  await generals.freezeBaseURI()
                  await expect(generals.setBaseURI("goodbye")).to.be.revertedWith(
                      "VerdomiGenerals__BaseUriIsFrozen"
                  )
              })
              it("Changes the BaseUri as expected.", async () => {
                  await generals.addAllowed(deployer.address)
                  await generals.mintGeneral(deployer.address, 1)
                  const before = await generals.tokenURI(0)
                  await generals.setBaseURI("hello")
                  const after = await generals.tokenURI(0)
                  await generals.setBaseURI("goodbye")
                  const afterAgain = await generals.tokenURI(0)
                  assert.equal(before.toString(), "")
                  assert.equal(after.toString(), "hello0")
                  assert.equal(afterAgain.toString(), "goodbye0")
              })
          })

          describe("freezeBaseURI", () => {
              it("Reverts if not owner.", async () => {
                  const playerConnectedGenerals = generals.connect(player)
                  await expect(playerConnectedGenerals.freezeBaseURI("hello")).to.be.reverted
              })
              it("Reverts if not at stage 5.", async () => {
                  await expect(generals.freezeBaseURI()).to.be.revertedWith(
                      "VerdomiGenerals__NotAtMaxStage"
                  )
                  await generals.nextStage()
                  await expect(generals.freezeBaseURI()).to.be.revertedWith(
                      "VerdomiGenerals__NotAtMaxStage"
                  )
                  await generals.nextStage()
                  await expect(generals.freezeBaseURI()).to.be.revertedWith(
                      "VerdomiGenerals__NotAtMaxStage"
                  )
                  await generals.nextStage()
                  await expect(generals.freezeBaseURI()).to.be.revertedWith(
                      "VerdomiGenerals__NotAtMaxStage"
                  )
                  await generals.nextStage()
                  const before = await generals.uriFrozen()
                  await generals.freezeBaseURI()
                  const isFrozen = await generals.uriFrozen()
                  assert.equal(isFrozen.toString(), "true")
                  assert.equal(before.toString(), "false")
              })
          })
      })

/*




*/
