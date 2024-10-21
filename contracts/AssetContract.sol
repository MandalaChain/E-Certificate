// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error VoucherNotExist();
error VoucherAlreadyExists();
error VoucherStillActive();
error Unauthorized();
error InvalidTokenId();
error VoucherAlreadyRedeemed();
error VoucherExpired();
error TransferNotAllowed();
error TokenNotExists();
error InvalidDate();

/**
 * @title AssetContract
 * @dev ERC721A contract for managing Levy Vouchers as soulbound tokens.
 *      Vouchers are issued, verified, redeemed, and extended, ensuring uniqueness and immutability.
 */
contract AssetContract is ERC721A, Ownable {
    /**
     * @dev Enum representing the status of a levy voucher.
     * @param Active    The voucher is active and can be redeemed.
     * @param Redeemed  The voucher has been redeemed and cannot be used again.
     * @param Expired   The voucher has expired and is no longer valid.
     */
    enum LevyStatus {
        Active,
        Redeemed,
        Expired
    }

    /**
     * @dev Struct representing the details of a levy voucher.
     * @param user              The user associated with the voucher.
     * @param voucherCode       A unique code identifying the voucher.
     * @param levyExpiredDate   The expiration date of the voucher.
     * @param levyStatus        The current status of the voucher.
     */
    struct Voucher {
        string user;
        uint256 createdDated;
        uint256 levyExpiredDate;
        LevyStatus levyStatus;
        string onChainUrl;
    }

    /// @notice Mapping from voucher hash to token ID.
    mapping(bytes32 => uint256) private _voucherHashes;

    /// @notice Mapping from token ID to Voucher details.
    mapping(uint256 => Voucher) private _levyVoucher;

    /**
     * @dev Emitted when a new voucher is issued.
     * @param tokenId       The unique identifier for the issued voucher token.
     * @param voucherHash   The unique hash representing the voucher data.
     * @param expiryDate    The expiration date of the voucher.
     * @param createdDated  The date the voucher was created.
     */
    event VoucherIssued(
        uint256 indexed tokenId,
        bytes32 voucherHash,
        uint256 expiryDate,
        uint256 createdDated
    );

    event SetVoucherURL(uint256 indexed tokenId, string onChainUrl);

    /**
     * @dev Emitted when a voucher is validated.
     * @param voucherHash  The unique hash representing the voucher data.
     * @param isValid      Indicates whether the voucher is valid.
     */
    event VoucherValidated(bytes32 voucherHash, bool isValid);

    /**
     * @dev Emitted when a voucher is redeemed.
     * @param tokenId        The unique identifier for the redeemed voucher token.
     * @param redeemedBy     The address that redeemed the voucher.
     */
    event Redeemed(uint256 tokenId, address redeemedBy);

    /**
     * @dev Emitted when a voucher's expiration date is extended.
     * @param voucherHash  The unique hash representing the voucher data.
     * @param extendDate   The new expiration date of the voucher.
     */
    event VoucherExtended(
        bytes32 indexed voucherHash,
        uint256 indexed extendDate
    );

    /**
     * @dev Initializes the contract by setting the token name and symbol.
     *      Also sets the deployer as the initial owner.
     */
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721A(_name, _symbol) Ownable(msg.sender) {}

    /**
     ** =============================================================================
     **                              EXTERNAL FUNCTION
     ** =============================================================================
     */

    /**
     * @notice Mints a new levy voucher.
     * @dev Can only be called by the contract owner.
     *      Generates a unique hash for the voucher and ensures no duplicates.
     *
     * @param voucherHash   The unique hash representing the voucher data.
     * @param userData      The user associated with the voucher.
     * @param expiryDate    The expiration date of the voucher.
     *
     * Requirements:
     * - The voucher hash must not already exist.
     */
    function mintVoucher(
        bytes32 voucherHash,
        string memory userData,
        uint256 expiryDate
    ) external onlyOwner {
        // Check if the voucher already exists
        if (_voucherHashes[voucherHash] != 0) {
            revert VoucherAlreadyExists();
        }

        uint256 _timeCreated = block.timestamp;
        if (expiryDate < _timeCreated) {
            revert InvalidDate();
        }

        uint256 tokenId = _nextTokenId();
        _mint(owner(), 1);

        _voucherHashes[voucherHash] = tokenId;
        _levyVoucher[tokenId] = Voucher({
            user: userData,
            createdDated: _timeCreated,
            levyExpiredDate: expiryDate,
            levyStatus: LevyStatus.Active,
            onChainUrl: ""
        });

        emit VoucherIssued(tokenId, voucherHash, expiryDate, _timeCreated);
    }

    /**
     * @notice Verifies the validity of a voucher based on its hash.
     * @dev Returns true if the voucher exists, is not expired, and has not been redeemed.
     * @param voucherHash The unique hash representing the voucher data.
     */
    function verifyVoucher(bytes32 voucherHash) external {
        (Voucher memory _voucher, uint256 _tokenId) = _getTokenVoucher(
            voucherHash
        );
        if (_voucher.levyStatus == LevyStatus.Redeemed) {
            revert VoucherAlreadyRedeemed();
        }
        if (_voucher.levyStatus == LevyStatus.Expired) {
            revert VoucherExpired();
        }
        if (_isExpired(_voucher, _tokenId)) {
            revert VoucherExpired();
        }
        emit VoucherValidated(voucherHash, true);
    }

    /**
     * @notice Sets the on-chain URL of a voucher.
     * @dev Can only be called by the contract owner.
     * @param voucherHash The unique hash representing the voucher data.
     * @param url         The on-chain URL of the voucher.
     * 
     * Requirements:
     * - The voucher must exist.
     */
    function setOnChainURL(
        bytes32 voucherHash,
        string memory url
    ) external onlyOwner {
        (, uint256 _tokenId) = _getTokenVoucher(voucherHash);
        _levyVoucher[_tokenId].onChainUrl = url;
        emit SetVoucherURL(_tokenId, url);
    }

    /**
     * @notice Redeems a voucher by updating its status to Redeemed.
     * @dev Can only be called by the contract owner.
     * @param voucherHash The unique identifier for the voucher token to be redeemed.
     *
     * Requirements:
     * - The voucher must exist.
     * - The voucher must not be expired.
     * - The voucher must not have been redeemed already.
     */
    function redeemVoucher(bytes32 voucherHash) external onlyOwner {
        (Voucher memory _voucher, uint256 _tokenId) = _getTokenVoucher(
            voucherHash
        );
        if (!_isExpired(_voucher, _tokenId)) {
            revert VoucherStillActive();
        }
        if (_voucher.levyStatus == LevyStatus.Redeemed) {
            revert VoucherAlreadyRedeemed();
        }

        // Update status to Redeemed
        _levyVoucher[_tokenId].levyStatus = LevyStatus.Redeemed;

        emit Redeemed(_tokenId, msg.sender);
    }

    /**
     * @notice Retrieves the voucher data associated with a specific hash.
     * @param voucherHash The unique hash representing the voucher data.
     * @return Voucher The Voucher struct containing all voucher details.
     *
     * Requirements:
     * - The voucher must exist.
     * - The token ID associated with the hash must be valid.
     */
    function getVoucherData(
        bytes32 voucherHash
    ) external view returns (Voucher memory) {
        (Voucher memory _voucher, ) = _getTokenVoucher(voucherHash);
        return _voucher;
    }

    /**
     * @notice Retrieves time created of the voucher data associated with a specific hash.
     * @param voucherHash The unique hash representing the voucher data.
     * @return Time created of the voucher.
     *
     * Requirements:
     * - The voucher must exist.
     * - The token ID associated with the hash must be valid.
     */
    function getDateMintingVoucher(
        bytes32 voucherHash
    ) external view returns (uint256) {
        uint256 _tokenId = _voucherHashes[voucherHash];
        if (_tokenId == 0) revert VoucherNotExist();
        if (!_exists(_tokenId)) revert InvalidTokenId();
        return _levyVoucher[_tokenId].createdDated;
    }

    /**
     * @notice Extends the expiration date of an existing voucher.
     * @dev Can only be called by the contract owner.
     * @param voucherHash The unique hash representing the voucher data.
     * @param extendDate  The new expiration date to set for the voucher.
     *
     * Requirements:
     * - The voucher must exist.
     * - The token ID associated with the hash must be valid.
     * - The voucher must have been redeemed before it can be extended.
     */
    function extendLevy(
        bytes32 voucherHash,
        uint256 extendDate
    ) external onlyOwner {
        (Voucher memory _voucher, uint256 _tokenId) = _getTokenVoucher(
            voucherHash
        );
        if (_voucher.levyStatus == LevyStatus.Redeemed) {
            revert VoucherAlreadyRedeemed();
        }
        if (extendDate == 0) {
            revert InvalidDate();
        }
        if (extendDate < block.timestamp) {
            revert InvalidDate();
        }
        if (extendDate < _voucher.levyExpiredDate) {
            revert InvalidDate();
        }
        _levyVoucher[_tokenId].levyExpiredDate = extendDate;
        emit VoucherExtended(voucherHash, extendDate);
    }

    /**
     ** =============================================================================
     **                              INTERNAL FUNCTION
     ** =============================================================================
     */

    /**
     * @dev Checks if a voucher has expired based on the current block timestamp.
     * @param _voucher The Voucher struct containing the expiration date.
     * @param _tokenId The token id from the voucher.
     * @return bool True if the voucher has expired, false otherwise.
     */
    function _isExpired(
        Voucher memory _voucher,
        uint256 _tokenId
    ) internal returns (bool) {
        if (block.timestamp > _voucher.levyExpiredDate) {
            _levyVoucher[_tokenId].levyStatus = LevyStatus.Expired;
            return true;
        }
        return false;
    }

    /**
     * @notice Retrieves the token ID associated with a given voucher hash.
     * @param _voucherHash The unique hash representing the voucher data.
     * @return uint256 The token ID associated with the voucher hash and the voucher data.
     *
     * Requirements:
     * - The voucher must exist.
     * - Token must exist.
     */
    function _getTokenVoucher(
        bytes32 _voucherHash
    ) internal view returns (Voucher memory, uint256) {
        uint256 _tokenId = _voucherHashes[_voucherHash];
        if (_tokenId == 0) {
            revert VoucherNotExist();
        }
        if (!_exists(_tokenId)) {
            revert TokenNotExists();
        }

        return (_levyVoucher[_tokenId], _tokenId);
    }

    /**
     ** =============================================================================
     **                              SOULBOND TOKEN
     ** =============================================================================
     */

    /**
     * @dev Overrides the ERC721A hook to prevent token transfers, ensuring tokens are soulbound.
     * @param from        The address transferring the token.
     * @param to          The address receiving the token.
     * @param startTokenId The ID of the token being transferred.
     * @param quantity    The number of tokens being transferred.
     *
     * Requirements:
     * - Tokens cannot be transferred between addresses after minting.
     */
    function _beforeTokenTransfers(
        address from,
        address to,
        uint256 startTokenId,
        uint256 quantity
    ) internal override {
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
        super._beforeTokenTransfers(from, to, startTokenId, quantity);
    }

    /**
     * @dev Overrides the ERC721A approve function to prevent approvals, maintaining the soulbound nature.
     * @param to        The address to approve.
     * @param tokenId   The ID of the token.
     *
     * Requirements:
     * - Approvals are not allowed for any token.
     */
    function approve(
        address to,
        uint256 tokenId
    ) public payable override onlyOwner {
        if (to != address(0) && tokenId == 0) {
            revert TransferNotAllowed();
        }
        revert TransferNotAllowed();
    }

    /**
     * @dev Overrides the ERC721A setApprovalForAll function to prevent approvals, maintaining the soulbound nature.
     * @param operator  The address to set as an operator.
     * @param approved  The approval status.
     *
     * Requirements:
     * - Operators cannot be approved for any tokens.
     */
    function setApprovalForAll(
        address operator,
        bool approved
    ) public pure override {
        if (operator != address(0) && approved == true) {
            revert TransferNotAllowed();
        }
        revert TransferNotAllowed();
    }

    /**
     * @dev Sets the starting token ID to 1 instead of the default 0.
     * @return uint256 The starting token ID.
     */
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }
}
