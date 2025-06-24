# AssetContract

## Overview
AssetContract is an ERC721A-based soulbound token smart contract for managing asset data records on-chain. It allows issuance, verification, redemption, and extension of data entries, ensuring uniqueness and immutability of asset records.

## Contract Details
- **Solidity version:** ^0.8.24
- **Inherits:** ERC721A, Ownable
- **Errors:**
  - `DataNotExist`
  - `DataAlreadyExists`
  - `InvalidTokenId`
  - `DataAlreadyRedeemed`
  - `DataExpired`
  - `TransferNotAllowed`
  - `TokenNotExists`
  - `DocumentNotApproved`
  - `DocumentAlreadyApproved`
  - `Unauthorized`
- **Events:**
  - `DataIssued(uint256 indexed tokenId, address issuer, bytes32 dataHash, bytes32 docType, uint256 createdDated)`
  - `SetDataURL(uint256 indexed tokenId, string onChainUrl)`
  - `DataValidated(bytes32 dataHash, bool isValid)`
  - `Redeemed(uint256 tokenId, address redeemedBy)`
  - `DataExtended(bytes32 indexed dataHash, uint256 indexed extendDate)`
  - `DocumentApproved(bytes32 indexed docTypeHash)`
- **Core Functions:**
  - `approveDocType(string docType)`
  - `setApproveClient(address client, bool status)`
  - `mintData(bytes32 dataHash, bytes32 docType, string assetData)`
  - `verifyData(bytes32 dataHash, bytes32 docType)`
  - `setOnChainURL(bytes32 dataHash, bytes32 docType, string url)`
  - `redeemData(bytes32 dataHash, bytes32 docType)`
  - `getAssetData(bytes32 dataHash, bytes32 docType) returns (Data)`
  - `getDateMintingData(bytes32 dataHash, bytes32 docType) returns (uint256)`
- **Soulbound Behavior:** Overrides transfer and approval functions to prevent transfers after minting. Token IDs start at 1.

## Prerequisites
- Node.js >= 16.x
- Yarn >= 4.x
- Hardhat
- Ethers.js & TypeChain

## Installation
```bash
git clone <your-repo-url>
cd <name-folder>
yarn install
```

## Common Commands
- **Compile:** `yarn compile`
- **Test:** `yarn test`
- **Coverage:** `yarn coverage` (if solidity-coverage configured)
- **Gas Report:** `REPORT_GAS=1 yarn test-gas`
- **Deploy:** `yarn deploy`

## Folder Structure
```
hardhat-boilerplate/
├── contracts/            # Solidity smart contracts
│   └── AssetContract.sol
├── config/               # Configuration files (CollectionConfig, ContractArguments)
├── lib/                  # NftContractProvider
├── scripts/              # Deployment & setup scripts
├── test/                 # Unit tests
├── .env                  # Environment variables
├── hardhat.config.ts     # Hardhat configuration
├── package.json
└── README.md
```

## API Reference
### `approveDocType(string docType)`
Approves a new document type. **Access:** Only owner.

### `setApproveClient(address client, bool status)`
Sets approval status for a client address. **Access:** Only owner.

### `mintData(bytes32 dataHash, bytes32 docType, string assetData)`
Mints a new soulbound token with associated asset data.
- **Reverts:** `DataAlreadyExists`, `DocumentNotApproved`

### `verifyData(bytes32 dataHash, bytes32 docType)`
Validates a data entry. Emits `DataValidated` on success.
- **Reverts:** `DataAlreadyRedeemed`, `DataExpired`, `DataNotExist`

### `setOnChainURL(bytes32 dataHash, bytes32 docType, string url)`
Sets the on-chain URL for an existing data entry.
- **Access:** Only approved clients.

### `redeemData(bytes32 dataHash, bytes32 docType)`
Redeems a data entry, updating its status to `Redeemed`.
- **Affects:** Emits `Redeemed`
- **Reverts:** `DataAlreadyRedeemed`, `DataExpired`, `DataNotExist`

### `getAssetData(bytes32 dataHash, bytes32 docType)`
Retrieves full data details for a given hash.

### `getDateMintingData(bytes32 dataHash, bytes32 docType)`
Returns the timestamp when the data was created.
- **Reverts:** `DataNotExist`, `InvalidTokenId`

## Contribution Guidelines
1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Commit your changes with clear, semantic messages: `git commit -m "feat: add ..."`
3. Push to your fork: `git push origin feat/your-feature`
4. Open a Pull Request describing your changes.

**Code Style:** Use Prettier for formatting and write tests for new functionality.


# Run Localhost

## Prerequisites

* Node.js (v14 or higher)
* Yarn package manager
* Hardhat installed in your project (`npm install --save-dev hardhat`)
* Your project’s `package.json` must define the following scripts:
  * `deploy-localhost`
  * `setup-client`
  * `setup-doctype`
* You can adding `Minter Role` with adding new lines in `scripts/3_setup_client.ts`.
* You can adding `Doc Type` with modified or adding new line in `scripts/4_setup_docType.ts`.

## Script: `deploy-local.sh`

This script will:
1. Launch a Hardhat local node in the background.
2. Wait until the node is ready on port `8545`.
3. Run the following Yarn commands in sequence:

   ```bash
   yarn deploy-localhost
   yarn setup-client --network localhost
   yarn setup-doctype --network localhost
   ```
4. Keep the node running until you terminate the script.
5. Automatically clean up (kill the Hardhat node) when you press `Ctrl+C` or when the script receives a termination signal.

### Key Features

* **Automatic readiness check**: Ensures commands run only after the node is up.
* **Signal trapping**: Gracefully shuts down the Hardhat node on `SIGINT`/`SIGTERM`.
* **Customizable**: Easily modify the Yarn commands or network settings as needed.

## Usage

1. Make the script executable:

   ```bash
   chmod +x deploy-local.sh
   ```
2. Run the script:

   ```bash
   ./deploy-local.sh
   ```
3. Once all steps finish, your local node will continue running. Press `Ctrl+C` to stop everything.

## Customization

* **Modify client**: If you want setup another minter please add new line in `scripts/3_setup_client.ts`.
* **Modify doc**: If you want setup another doc please add new line in `scripts/4_setup_docType.ts`.
* **Adjust commands**: Swap or append Yarn commands as your workflow requires.
* **Remove wait**: If you prefer the script to exit after the commands, replace the `wait $NODE_PID` with `kill $NODE_PID` right after your commands.

---

*Happy coding!*
