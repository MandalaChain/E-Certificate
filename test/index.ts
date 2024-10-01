import chai, { expect } from "chai";
import ChaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { AbiCoder } from "ethers";
import CollectionConfig from "../config/CollectionConfig";
import ContractArguments from "../config/ContractArguments";
import { NftContractType } from "../lib/NftContractProvider";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

chai.use(ChaiAsPromised);

describe(CollectionConfig.contractName, async function () {
  let contract!: NftContractType;
  let owner!: SignerWithAddress;
  let other!: SignerWithAddress;
  const abiCoder = new AbiCoder();

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

  const voucherHash = keccak256(
    abiCoder.encode(
      ["string", "string", "string", "string", "uint256"],
      [
        voucher.user.passport,
        voucher.user.name,
        voucher.user.email,
        voucher.voucherCode,
        voucher.levyExpiredDate,
      ]
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

  const voucherHashError = keccak256(
    abiCoder.encode(
      ["string", "string", "string", "string", "uint256"],
      [
        voucherError.user.passport,
        voucherError.user.name,
        voucherError.user.email,
        voucherError.voucherCode,
        voucherError.levyExpiredDate,
      ]
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

    await contract.waitForDeployment();
  });

  it("Check initial data", async function () {
    expect(await contract.name()).to.equal(CollectionConfig.tokenName);
    expect(await contract.symbol()).to.equal(CollectionConfig.tokenSymbol);

    expect(await contract.totalSupply()).to.equal(BigInt(0));
  });

  it("Owner only functions", async function () {
    await expect(
      contract.connect(other).mintVoucher(voucher)
    ).to.be.rejectedWith(`OwnableUnauthorizedAccount("${other.address}")`);

    await expect(
      contract.connect(other).redeemVoucher(voucherHashError)
    ).to.be.rejectedWith(`OwnableUnauthorizedAccount("${other.address}")`);

    await expect(
      contract.connect(other).extendLevy(voucherHash, BigInt(1))
    ).to.be.rejectedWith(`OwnableUnauthorizedAccount("${other.address}")`);
  });

  it("Mint Voucher Levy", async function () {
    await contract.connect(owner).mintVoucher(voucher);

    expect(await contract.totalSupply()).to.equal(BigInt(1));
  });

  it("Should Error if voucher already exists", async function () {
    await expect(
      contract.connect(owner).mintVoucher(voucher)
    ).to.be.rejectedWith("VoucherAlreadyExists");
  });

  it("Should return false from verify voucher cause not mint before", async function () {
    await expect(
      contract.connect(owner).verifyVoucher(voucherHashError)
    ).to.be.rejectedWith("VoucherNotExist");
  });

  it("Success verify voucher", async function () {
    await contract.connect(other).verifyVoucher(voucherHash);
  });

  it("Check initial data from voucher", async function () {
    const voucherData = await contract.getVoucherData(voucherHash);
    expect(voucherData.user.passport).to.equal(voucher.user.passport);
    expect(voucherData.user.name).to.equal(voucher.user.name);
    expect(voucherData.user.email).to.equal(voucher.user.email);
    expect(voucherData.user.arrivalDate).to.equal(
      BigInt(voucher.user.arrivalDate)
    );
    expect(voucherData.voucherCode).to.equal(voucher.voucherCode);
    expect(voucherData.levyExpiredDate).to.equal(
      BigInt(voucher.levyExpiredDate)
    );
    expect(voucherData.levyStatus).to.equal(BigInt(voucher.levyStatus));
  });

  it("Should return error from verify voucher cause expired", async function () {
    // increase time
    await ethers.provider.send("evm_increaseTime", [
      Math.floor(Date.now() / 1000) + 86401 * 60,
    ]);
    await ethers.provider.send("evm_mine");

    await expect(
      contract.connect(other).verifyVoucher(voucherHash)
    ).to.be.rejectedWith("VoucherExpired");
  });

  it("Should return error from extend voucher cause date input = 0", async function () {
    await expect(
      contract.connect(owner).extendLevy(voucherHash, BigInt(0))
    ).to.be.rejectedWith("InvalidDate");
  });

  it("Should return error from extend voucher cause date input < Date Now", async function () {
    await expect(
      contract
        .connect(owner)
        .extendLevy(
          voucherHash,
          BigInt(Math.floor(Date.now() / 1000) + 86401 * 60)
        )
    ).to.be.rejectedWith("InvalidDate");
  });

  it("Should return error from extend voucher cause date input < expired time", async function () {
    const voucherData = await contract.getVoucherData(voucherHash);
    const setTime = voucherData.levyExpiredDate - BigInt(60);
    await expect(
      contract.connect(owner).extendLevy(voucherHash, setTime)
    ).to.be.rejectedWith("InvalidDate");
  });

  it("Success Extend Levy", async function () {
    const timeNow = (await ethers.provider.getBlock("latest"))!.timestamp;
    const setTimeExtend = timeNow + 86400 * 60;
    await contract
      .connect(owner)
      .extendLevy(voucherHash, BigInt(setTimeExtend));
  });

  it("Should error Reedem Voucher cause voucher still active", async function () {
    await expect(
      contract.connect(owner).redeemVoucher(voucherHash)
    ).to.be.rejectedWith("VoucherStillActive");
  });

  it("Success from verify voucher after extend", async function () {
    await contract.connect(other).verifyVoucher(voucherHash);
  });

  it("Should return error from verify voucher cause expired after extend", async function () {
    // increase time
    await ethers.provider.send("evm_increaseTime", [
      Math.floor(Date.now() / 1000) + 86401 * 60,
    ]);
    await ethers.provider.send("evm_mine");

    await expect(
      contract.connect(other).verifyVoucher(voucherHash)
    ).to.be.rejectedWith("VoucherExpired");
  });

  it("Reedem Voucher", async function () {
    await contract.connect(owner).redeemVoucher(voucherHash);
  });

  it("Should error Reedem Voucher cause voucher already redeemed", async function () {
    await expect(
      contract.connect(owner).redeemVoucher(voucherHash)
    ).to.be.rejectedWith("VoucherAlreadyRedeemed");
  });

  it("Should error Reedem Voucher cause voucher not exist", async function () {
    await expect(
      contract.connect(owner).redeemVoucher(voucherHashError)
    ).to.be.rejectedWith("VoucherNotExist");
  });

  it("Should return error from verify voucher cause already redeemed", async function () {
    await expect(
      contract.connect(other).verifyVoucher(voucherHash)
    ).to.be.rejectedWith("VoucherAlreadyRedeemed");
  });

  it("Should return error from extend voucher cause already redeemed", async function () {
    await expect(
      contract
        .connect(owner)
        .extendLevy(
          voucherHash,
          BigInt(Math.floor(Date.now() / 1000) + 86401 * 60)
        )
    ).to.be.rejectedWith("VoucherAlreadyRedeemed");
  });
});
