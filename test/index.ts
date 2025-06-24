import chai, { expect } from "chai";
import ChaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import keccak256 from "keccak256";
// import { toBigInt, AbiCoder } from "ethers";
import CollectionConfig from "../config/CollectionConfig";
import ContractArguments from "../config/ContractArguments";
import { NftContractType } from "../lib/NftContractProvider";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(ChaiAsPromised);

describe(CollectionConfig.contractName, async function () {
  let contract!: NftContractType;
  let owner!: any;
  let other!: any;

  const docType = "LEVY";
  const hashDocType = keccak256(
    ethers.utils.defaultAbiCoder.encode(["string"], [docType])
  );

  const voucher = {
    user: {
      passport: "A12345678",
      name: "John Doe",
      email: "johndoe@example.com",
      arrivalDate: BigInt(Math.floor(Date.now() / 1000) + 86400), // 1 day from now (Unix timestamp)
    },
    voucherCode: "LEVY123456",
    levyExpiredDate: BigInt(Math.floor(Date.now() / 1000) + 86400 * 60), // 60 days from now
    levyStatus: 0, // Active
  };

  const voucherHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      [
        voucher.user.passport,
        voucher.user.name,
        voucher.user.email,
        voucher.voucherCode,
        voucher.levyExpiredDate.toString(),
      ].join(",")
    )
  );

  const voucherError = {
    user: {
      passport: "A123456789",
      name: "John Doe Romlah",
      email: "johndoe123@example.com",
      arrivalDate: BigInt(Math.floor(Date.now() / 1000) + 86401), // 1 day from now (Unix timestamp)
    },
    voucherCode: "LEVY123456789",
    levyExpiredDate: BigInt(Math.floor(Date.now() / 1000) + 86401 * 60), // 60 days from now
    levyStatus: 2, // Expired
  };

  const voucherHashError = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes(
      [
        voucherError.user.passport,
        voucherError.user.name,
        voucherError.user.email,
        voucherError.voucherCode,
        voucherError.levyExpiredDate,
      ].join(",")
    )
  );

  before(async function () {
    [owner, other] = await ethers.getSigners();
  });

  it("Contract deployment", async function () {
    const Contract = await ethers.getContractFactory(
      CollectionConfig.contractName
    );
    contract = (await Contract.deploy(
      ...ContractArguments
    )) as unknown as NftContractType;

    await contract.deployed();
    await contract.connect(owner).approveDocType(docType);
  });

  it("Check initial data", async function () {
    expect(await contract.name()).to.equal(CollectionConfig.tokenName);
    expect(await contract.symbol()).to.equal(CollectionConfig.tokenSymbol);
    expect(
      await contract.hasRole(
        await contract.MINTER_ROLE(),
        await owner.getAddress()
      )
    ).to.equal(true);

    expect((await contract.totalSupply()).toString()).to.equal("0");
  });

  it("Owner only functions", async function () {
    await expect(
      contract.connect(other).mintData(voucherHash, hashDocType, "123")
    ).to.be.rejectedWith(
      `'AccessControlUnauthorizedAccount("${await other.getAddress()}", "${await contract.MINTER_ROLE()}")'`
    );

    await expect(
      contract.connect(other).redeemData(voucherHashError, hashDocType)
    ).to.be.rejectedWith(
      `'AccessControlUnauthorizedAccount("${await other.getAddress()}", "${await contract.MINTER_ROLE()}")'`
    );
  });

  it("Mint Voucher Levy", async function () {
    await contract.connect(owner).mintData(voucherHash, hashDocType, "asseet");

    expect((await contract.totalSupply()).toString()).to.equal("1");
  });

  it ("Mint Voucher Levy with Meta Transaction", async function () {
    const nonce = Number(
          await contract.nonces(await owner.getAddress())
        );

        const functionCall = contract.interface.encodeFunctionData(
          "mintData",
          [voucherHashError, hashDocType, "asseet"]
        );

        const eip712 = await contract.eip712Domain();
        const domain = {
          name: eip712.name,
          version: eip712.version,
          chainId: eip712.chainId,
          verifyingContract: eip712.verifyingContract,
        };

        const types = {
          MetaTransaction: [
            { name: "from", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "functionCall", type: "bytes" },
          ],
        };

        const value = {
          from: await owner.getAddress(),
          nonce: nonce,
          functionCall: functionCall,
        };

        const signature = await owner._signTypedData(domain, types, value);

        const tx = await contract
          .connect(other)
          .executeMetaTransaction(
            await owner.getAddress(),
            nonce,
            functionCall,
            signature
          );

        await tx.wait();
  })

  it("Should Error if voucher already exists", async function () {
    await expect(
      contract.connect(owner).mintData(voucherHash, hashDocType, "asseet")
    ).to.be.rejectedWith("DataAlreadyExists");
  });
});
