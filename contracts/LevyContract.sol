// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4671} from "./token/ERC4671.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

error VoucherNotExist();
error VoucherStillValid();

contract LevyContract is ERC4671, Ownable {
    struct Voucher {
        string name;
        string email;
        string passportNumber;
        uint256 arrivalDate;
        uint256 expirationDate;
    }

    mapping(bytes32 => mapping(uint256 => Voucher)) private _vouchers;

    event VoucherIssued(
        bytes32 indexed owner,
        uint256 tokenId,
        uint256 expirationDate
    );
    event VoucherValidated(
        bytes32 indexed voucher,
        uint256 tokenId,
        bool isValid
    );

    constructor() ERC4671("Levy Voucher Qr", "LVQ") Ownable(msg.sender) {}

    function generateUniqueBytes32(
        string memory nameVisiotor,
        string memory email,
        string memory passportNumber
    ) private view returns (bytes32) {
        // Combine user address, custom input, block timestamp, and nonce to generate a unique hash
        uint256 _nonce = emittedCount();
        bytes32 uniqueHash = keccak256(
            abi.encodePacked(
                nameVisiotor,
                email,
                passportNumber,
                block.timestamp,
                _nonce
            )
        );

        return uniqueHash;
    }

    // Issue a new voucher
    function issueVoucher(
        string memory nameVisiotor,
        string memory email,
        string memory passportNumber,
        uint256 arrivalDate
    ) external onlyOwner {
        // ! please adding security system
        uint256 _expirationDate = arrivalDate + 60 days;
        uint256 _newTokenId = emittedCount();
        bytes32 _idVoucher = generateUniqueBytes32(
            nameVisiotor,
            email,
            passportNumber
        );

        _vouchers[_idVoucher][_newTokenId] = Voucher(
            nameVisiotor,
            email,
            passportNumber,
            arrivalDate,
            _expirationDate
        );
        _mint(msg.sender);

        emit VoucherIssued(_idVoucher, _newTokenId, _expirationDate);
    }

    // Validate Voucher (simulate scanning QR code)
    function validateVoucher(
        bytes32 idVoucher,
        uint256 tokenId
    ) external returns (bool) {
        if (!_exists(idVoucher, tokenId)) {
            revert VoucherNotExist();
        }

        uint256 _dateExpired = _vouchers[idVoucher][tokenId].expirationDate;
        if (!_checkExpired(_dateExpired)) {
            revert VoucherStillValid();
        }

        emit VoucherValidated(idVoucher, tokenId, true);
        return true;
    }

    // Helper function to check if a voucher exists
    function _exists(
        bytes32 _idVoucher,
        uint256 _tokenId
    ) private view returns (bool) {
        string memory _data = _vouchers[_idVoucher][_tokenId].name;
        return
            keccak256(abi.encodePacked(_data)) !=
            keccak256(abi.encodePacked(""));
    }

    function _checkExpired(uint256 _dateExpired) private view returns (bool) {
        return block.timestamp > _dateExpired;
    }

    // View function to get voucher details
    function getVoucherDetails(
        bytes32 idVoucher,
        uint256 tokenId
    )
        external
        view
        returns (string memory, string memory, string memory, uint256, uint256)
    {
        if (!_exists(idVoucher, tokenId)) {
            revert VoucherNotExist();
        }
        Voucher memory voucher = _vouchers[idVoucher][tokenId];
        return (
            voucher.name,
            voucher.email,
            voucher.passportNumber,
            voucher.arrivalDate,
            voucher.expirationDate
        );
    }
}
