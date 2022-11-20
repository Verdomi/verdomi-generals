// SPDX-License-Identifier: MIT
import "./ERC721A.sol";
import "./AllowedAddresses.sol";

pragma solidity ^0.8.7;

error VerdomiGenerals__NotEnoughMinted();
error VerdomiGenerals__ExceedsMaxSupply();
error VerdomiGenerals__MaxStage();
error VerdomiGenerals__BaseUriIsFrozen();
error VerdomiGenerals__NotAtMaxStage();

contract VerdomiGenerals is ERC721A, AllowedAddresses {
    string constant NAME = "Verdomi Generals";
    string constant SYMBOL = "VGEN";

    uint8 private s_stage = 1;
    string private s_baseUri = "";
    bool private isUriFrozen = false;

    constructor() ERC721A(NAME, SYMBOL) {}

    // =============================================================
    //                       MODIFIERS
    // =============================================================

    /**
     * @dev Throws if less than 2000 tokens have been minted
     */
    modifier minimumMints() {
        if (_nextTokenId() < 2000) {
            revert VerdomiGenerals__NotEnoughMinted();
        }
        _;
    }

    // =============================================================
    //                       FUNCTIONS
    // =============================================================

    function mintGeneral(address to, uint256 quantity) public onlyAllowedAddresses {
        if (_nextTokenId() + quantity > maxSupply()) {
            revert VerdomiGenerals__ExceedsMaxSupply();
        }
        _safeMint(to, quantity);
    }

    function nextStage() external onlyOwner {
        if (s_stage < 5) {
            unchecked {
                ++s_stage;
            }
        } else {
            revert VerdomiGenerals__MaxStage();
        }
    }

    function setBaseURI(string memory uri) external onlyOwner {
        if (isUriFrozen) {
            revert VerdomiGenerals__BaseUriIsFrozen();
        }
        s_baseUri = uri;
    }

    function freezeBaseURI() external onlyOwner {
        if (s_stage < 5) {
            revert VerdomiGenerals__NotAtMaxStage();
        }
        isUriFrozen = true;
    }

    // =============================================================
    //                       APPROVAL FUNCTIONS
    // =============================================================
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
        minimumMints
    {
        _operatorApprovals[_msgSenderERC721A()][operator] = approved;
        emit ApprovalForAll(_msgSenderERC721A(), operator, approved);
    }

    function approve(address to, uint256 tokenId) public payable virtual override minimumMints {
        _approve(to, tokenId, true);
    }

    // =============================================================
    //                       VIEW FUNCTIONS
    // =============================================================
    function maxSupply() public view returns (uint256) {
        return s_stage * 2000;
    }

    function _baseURI() internal view override returns (string memory) {
        return s_baseUri;
    }

    function uriFrozen() public view returns (bool) {
        return isUriFrozen;
    }
}
