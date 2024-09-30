// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

error VoucherNotExist();
error VoucherAlreadyExists();
error Unauthorized();
error InvalidTokenId();
error TokenAlreadyRedeemed();
error TokenExpired();
error TransferNotAllowed();

/**
 * @title LevyContract
 * @dev ERC721A contract for managing Levy Vouchers as soulbound tokens.
 *      Vouchers are issued, verified, redeemed, and extended, ensuring uniqueness and immutability.
 */
contract LevyContract is ERC721A, Ownable {
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
     * @dev Struct representing a user's information associated with a voucher.
     * @param passport      The user's passport number.
     * @param name          The user's full name.
     * @param email         The user's email address.
     * @param arrivalDate   The date of arrival for the user.
     */
    struct User {
        string passport;
        string name;
        string email;
        uint256 arrivalDate;
    }

    /**
     * @dev Struct representing the details of a levy voucher.
     * @param user              The user associated with the voucher.
     * @param voucherCode       A unique code identifying the voucher.
     * @param levyExpiredDate   The expiration date of the voucher.
     * @param levyStatus        The current status of the voucher.
     */
    struct Voucher {
        User user;
        string voucherCode;
        uint256 levyExpiredDate;
        LevyStatus levyStatus;
    }

    /// @notice Mapping from voucher hash to token ID.
    mapping(bytes32 => uint256) private _voucherHashes;

    /// @notice Mapping from token ID to Voucher details.
    mapping(uint256 => Voucher) private _levyVoucher;

    /**
     * @dev Emitted when a new voucher is issued.
     * @param tokenId      The unique identifier for the issued voucher token.
     * @param voucherHash  The unique hash representing the voucher data.
     * @param expiryDate   The expiration date of the voucher.
     */
    event VoucherIssued(
        uint256 indexed tokenId,
        bytes32 voucherHash,
        uint256 expiryDate
    );

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
    constructor() ERC721A("Levy Voucher Qr", "LVQ") Ownable(msg.sender) {}

    /**
     * @notice Mints a new levy voucher.
     * @dev Can only be called by the contract owner.
     *      Generates a unique hash for the voucher and ensures no duplicates.
     * @param voucher The Voucher struct containing all necessary voucher data.
     *
     * Requirements:
     * - The voucher must not already exist.
     */
    function mintVoucher(Voucher calldata voucher) external onlyOwner {
        bytes32 dataHash = _generateHash(voucher);

        // Check if the voucher already exists
        if (_voucherHashes[dataHash] != 0) {
            revert VoucherAlreadyExists();
        }

        uint256 tokenId = _nextTokenId();
        _mint(owner(), 1);
        _voucherHashes[dataHash] = tokenId;
        _levyVoucher[tokenId] = voucher;

        emit VoucherIssued(tokenId, dataHash, voucher.levyExpiredDate);
    }

    /**
     * @notice Verifies the validity of a voucher based on its hash.
     * @dev Returns true if the voucher exists, is not expired, and has not been redeemed.
     * @param voucherHash The unique hash representing the voucher data.
     * @return bool True if the voucher is valid, false otherwise.
     */
    function verifyVoucher(bytes32 voucherHash) external view returns (bool) {
        uint256 _tokenId = _voucherHashes[voucherHash];
        if (_tokenId == 0) {
            return false;
        }
        if (!_exists(_tokenId)) {
            return false;
        }
        Voucher storage _voucher = _levyVoucher[_tokenId];
        if (_isExpired(_voucher)) {
            return false;
        }
        if (_voucher.levyStatus == LevyStatus.Redeemed) {
            return false;
        }
        return true;
    }

    /**
     * @notice Redeems a voucher by updating its status to Redeemed.
     * @dev Can only be called by the contract owner.
     * @param tokenId The unique identifier for the voucher token to be redeemed.
     *
     * Requirements:
     * - The voucher must exist.
     * - The voucher must not be expired.
     * - The voucher must not have been redeemed already.
     */
    function redeemVoucher(uint256 tokenId) external onlyOwner {
        if (!_exists(tokenId)) {
            revert InvalidTokenId();
        }
        Voucher storage _voucher = _levyVoucher[tokenId];
        if (_isExpired(_voucher)) {
            revert TokenExpired();
        }
        if (_voucher.levyStatus == LevyStatus.Redeemed) {
            revert TokenAlreadyRedeemed();
        }

        // Update status to Redeemed
        _voucher.levyStatus = LevyStatus.Redeemed;

        emit Redeemed(tokenId, msg.sender);
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
        uint256 _tokenId = _voucherHashes[voucherHash];
        if (_tokenId == 0) revert VoucherNotExist();
        if (!_exists(_tokenId)) revert InvalidTokenId();
        return _levyVoucher[_tokenId];
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
        uint256 _tokenId = _voucherHashes[voucherHash];
        if (_tokenId == 0) {
            revert VoucherNotExist();
        }
        if (!_exists(_tokenId)) {
            revert InvalidTokenId();
        }
        Voucher storage _voucher = _levyVoucher[_tokenId];
        if (_voucher.levyStatus != LevyStatus.Redeemed) {
            revert TokenAlreadyRedeemed();
        }
        _voucher.levyExpiredDate = extendDate;
        emit VoucherExtended(voucherHash, extendDate);
    }

    /**
     * @dev Generates a unique hash for a given voucher.
     * @param _voucher The Voucher struct containing all necessary voucher data.
     * @return bytes32 The unique hash representing the voucher.
     */
    function _generateHash(
        Voucher calldata _voucher
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _voucher.user.passport,
                    _voucher.user.name,
                    _voucher.user.email,
                    _voucher.voucherCode,
                    _voucher.levyExpiredDate
                )
            );
    }

    /**
     * @dev Checks if a voucher has expired based on the current block timestamp.
     * @param _voucher The Voucher struct containing the expiration date.
     * @return bool True if the voucher has expired, false otherwise.
     */
    function _isExpired(Voucher memory _voucher) internal view returns (bool) {
        return block.timestamp > _voucher.levyExpiredDate;
    }

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
