// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IERC721A.sol";

error GeneralMinter__CollectionNotEligible();
error GeneralMinter__AllPersonalFreeMintsClaimed();
error GeneralMinter__AllGeneralFreeMintsClaimed();
error GeneralMinter__NftBalanceTooLow();
error GeneralMinter__NoContractsAllowed();
error GeneralMinter__NotEnoughFunds();
error GeneralMinter__TransferFailed();

interface VerodmiGenerals {
    function mintGeneral(address to, uint256 quantity) external;
}

contract GeneralMinter is Ownable {
    VerodmiGenerals immutable generals;
    address immutable i_generalsAddress;
    uint256 constant PRICE = 0.01 ether;

    mapping(address => bool) private freeMintCollections;
    mapping(address => uint8) private numberOfFreeMints;

    uint256 private s_amountFreeClaims = 0;

    constructor(address generalContract) {
        generals = VerodmiGenerals(generalContract);
        i_generalsAddress = generalContract;
    }

    function claimFreeMint(uint8 amount, address freeMintAddress) external {
        // Collection must be allowed to claim a free General
        if (!freeMintCollections[freeMintAddress]) {
            revert GeneralMinter__CollectionNotEligible();
        }

        // Sender can at max claim 3 free mints
        if (numberOfFreeMints[msg.sender] + amount > 3) {
            revert GeneralMinter__AllPersonalFreeMintsClaimed();
        }

        // Less than 1500 must have been claimed for free
        if (s_amountFreeClaims + amount >= 1500) {
            revert GeneralMinter__AllGeneralFreeMintsClaimed();
        }

        // Sender must not be a contract
        if (msg.sender != tx.origin) {
            revert GeneralMinter__NoContractsAllowed();
        }

        // Sender must own NFT from the free mint collection
        IERC721A nft = IERC721A(freeMintAddress);
        if (!(nft.balanceOf(msg.sender) > 0)) {
            revert GeneralMinter__NftBalanceTooLow();
        }
        unchecked {
            s_amountFreeClaims += amount;
        }
        numberOfFreeMints[msg.sender] += amount;
        generals.mintGeneral(msg.sender, amount);
    }

    function mintGeneral(uint256 amount) external payable {
        if (msg.value < amount * PRICE) {
            revert GeneralMinter__NotEnoughFunds();
        }
        generals.mintGeneral(msg.sender, amount);
    }

    function addFreeMintCollection(address contractAddress) external onlyOwner {
        freeMintCollections[contractAddress] = true;
    }

    function removeFreeMintCollection(address contractAddress) external onlyOwner {
        freeMintCollections[contractAddress] = false;
    }

    function withdrawFunds() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        if (!success) {
            revert GeneralMinter__TransferFailed();
        }
    }

    // View

    function isFreeMintCollection(address contractAddress) public view returns (bool) {
        return freeMintCollections[contractAddress];
    }

    function price() external pure returns (uint256) {
        return PRICE;
    }
}
