import chai, { expect } from "chai";
import ChaiAsPromised from "chai-as-promised";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import CollectionConfig from "../config/CollectionConfig";
import ContractArguments from "../config/ContractArguments";
import { NftContractType } from "../lib/NftContractProvider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

chai.use(ChaiAsPromised);

function getPrice(price: string, mintAmount: number) {
  return ethers.parseEther(price).mul(mintAmount);
}

describe(CollectionConfig.contractName, async function () {
  let contract!: NftContractType;
  let owner!: SignerWithAddress;
  let legendaryMinter!: SignerWithAddress;
  let epicMinter!: SignerWithAddress;
  let rareMinter!: SignerWithAddress;

  before(async function () {
    [owner, legendaryMinter, epicMinter, rareMinter] =
      await ethers.getSigners();
  });

  it("Contract deployment", async function () {
    const Contract = await ethers.getContractFactory(
      CollectionConfig.contractName
    );
    contract = (await Contract.deploy(
      ...ContractArguments
    )) as unknown as NftContractType;

    await contract.deployed();
  });

  it("Check initial data", async function () {
    expect(await contract.name()).to.equal("Test Reality Chain Avatar");
    expect(await contract.symbol()).to.equal("TRCA");

    // Legendary avatar spesification
    expect((await contract.avatar(0)).supply).to.equal(50);
    expect((await contract.avatar(0)).cost).to.equal(utils.parseEther("0.05"));
    expect((await contract.avatar(0)).minted).to.equal(1);

    // Epic avatar spesification
    expect((await contract.avatar(1)).supply).to.equal(950);
    expect((await contract.avatar(1)).cost).to.equal(utils.parseEther("0.03"));
    expect((await contract.avatar(1)).minted).to.equal(1);
    
    // Rare avatar spesification
    expect((await contract.avatar(2)).supply).to.equal(2000);
    expect((await contract.avatar(2)).cost).to.equal(utils.parseEther("0.01"));
    expect((await contract.avatar(2)).minted).to.equal(1);

    expect(await contract.totalSupply()).to.equal(0);
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await legendaryMinter.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await epicMinter.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await rareMinter.getAddress())).to.equal(0);

    // keep tracking that there is no token ID = 0
    await expect(contract.tokenURI(0)).to.be.revertedWith("ERC721: invalid token ID");
  });

  it("Before any else", async function () {
    // nobody should be able to mint because merkle root is not in set
    // Legendary mint
    await expect(
      contract.connect(legendaryMinter).mint(0, [], "")
    ).to.be.revertedWith("InvalidProof");

    // Epic mint
    await expect(
      contract.connect(epicMinter).mint(1, [], "")
    ).to.be.revertedWith("InvalidProof");

    // Rare mint
    await expect(
      contract.connect(rareMinter).mint(2, [], "")
    ).to.be.revertedWith("InvalidProof");

    await expect(contract.withdraw()).to.be.revertedWith("InsufficientFunds");
  });

  it("Owner only functions", async function () {
    await expect(
      contract.connect(legendaryMinter).setMerkleRoot(0, 0x00)
    ).to.be.revertedWith("");

    await expect(
      contract.connect(rareMinter).withdraw()
    ).to.be.revertedWith("Ownable: caller is not the owner");

  });

  it("Legendary Mint", async function () {
    const whitelistLegendaryAddresses = [
      "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
      "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
      "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
      "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
      "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
      "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
      "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
      "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      await legendaryMinter.getAddress(),
    ];
    // setup merkel root
    const leafNodes = whitelistLegendaryAddresses.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true, });
    const rootHash = merkleTree.getHexRoot();
    // Update the root hash
    await (await contract.setMerkleRoot(0, rootHash)).wait();

    // check merklerooot
    await expect(
      contract
        .connect(epicMinter)
        .mint(0,
          merkleTree.getHexProof(keccak256(await epicMinter.getAddress())),
          "",
          { value: getPrice("0.05", 1) }
        )
    ).to.be.revertedWith("InvalidProof");
    await expect(
      contract
        .connect(rareMinter)
        .mint(0,
          merkleTree.getHexProof(keccak256(await rareMinter.getAddress())),
          "",
          { value: getPrice("0.05", 1) }
        )
    ).to.be.revertedWith("InvalidProof");

    // check cost
    await expect(
      contract
        .connect(legendaryMinter)
        .mint(0,
          merkleTree.getHexProof(keccak256(await legendaryMinter.getAddress())),
          "",
          { value: getPrice("0.04", 1) }
        )
    ).to.be.revertedWith("InsufficientFunds");

    // minting success
    await contract
      .connect(legendaryMinter)
      .mint(0,
        merkleTree.getHexProof(keccak256(await legendaryMinter.getAddress())),
        "", // this is metadata input CID from IPFS
        { value: getPrice("0.05", 1) }
      );

    // try to mint again
    await expect(
      contract
        .connect(legendaryMinter)
        .mint(0,
          merkleTree.getHexProof(keccak256(await legendaryMinter.getAddress())),
          "",
          { value: getPrice("0.05", 1) }
        )
    ).to.be.revertedWith("ExceedeedTokenClaiming");

    // check supply
    expect((await contract.avatar(0)).minted).to.equal(2);
    expect(await contract.totalSupply()).to.be.equal(1);

    // check balance
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await legendaryMinter.getAddress())).to.equal(1);
    expect(await contract.balanceOf(await epicMinter.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await rareMinter.getAddress())).to.equal(0);
  });

  it("Epic Mint", async function () {
    const whitelistEpicAddresses = [
      "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
      "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
      "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      await epicMinter.getAddress(),
    ];
    // setup merkel root
    const leafNodes = whitelistEpicAddresses.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true, });
    const rootHash = merkleTree.getHexRoot();
    // Update the root hash
    await (await contract.setMerkleRoot(1, rootHash)).wait();

    // check merklerooot
    await expect(
      contract
        .connect(legendaryMinter)
        .mint(1,
          merkleTree.getHexProof(keccak256(await legendaryMinter.getAddress())),
          "",
          { value: getPrice("0.03", 1) }
        )
    ).to.be.revertedWith("InvalidProof");
    await expect(
      contract
        .connect(rareMinter)
        .mint(1,
          merkleTree.getHexProof(keccak256(await rareMinter.getAddress())),
          "",
          { value: getPrice("0.03", 1) }
        )
    ).to.be.revertedWith("InvalidProof");

    // check cost
    await expect(
      contract
        .connect(epicMinter)
        .mint(1,
          merkleTree.getHexProof(keccak256(await epicMinter.getAddress())),
          "",
          { value: getPrice("0.02", 1) }
        )
    ).to.be.revertedWith("InsufficientFunds");

    // minting success
    await contract
      .connect(epicMinter)
      .mint(1,
        merkleTree.getHexProof(keccak256(await epicMinter.getAddress())),
        "", // this is metadata input CID from IPFS
        { value: getPrice("0.03", 1) }
      );

    // try to mint again
    await expect(
      contract
        .connect(epicMinter)
        .mint(1,
          merkleTree.getHexProof(keccak256(await epicMinter.getAddress())),
          "",
          { value: getPrice("0.03", 1) }
        )
    ).to.be.revertedWith("ExceedeedTokenClaiming");

    // check supply
    expect((await contract.avatar(1)).minted).to.equal(2);
    expect(await contract.totalSupply()).to.be.equal(2);

    // check balance
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await legendaryMinter.getAddress())).to.equal(1);
    expect(await contract.balanceOf(await epicMinter.getAddress())).to.equal(1);
    expect(await contract.balanceOf(await rareMinter.getAddress())).to.equal(0);
  });

  it("Rare Mint", async function () {
    const whitelistRareAddresses = [
      "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
      "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      await rareMinter.getAddress(),
    ];
    // setup merkel root
    const leafNodes = whitelistRareAddresses.map((addr) => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true, });
    const rootHash = merkleTree.getHexRoot();
    // Update the root hash
    await (await contract.setMerkleRoot(2, rootHash)).wait();

    // check merklerooot
    await expect(
      contract
        .connect(legendaryMinter)
        .mint(2,
          merkleTree.getHexProof(keccak256(await legendaryMinter.getAddress())),
          "",
          { value: getPrice("0.01", 1) }
        )
    ).to.be.revertedWith("InvalidProof");
    await expect(
      contract
        .connect(epicMinter)
        .mint(2,
          merkleTree.getHexProof(keccak256(await epicMinter.getAddress())),
          "",
          { value: getPrice("0.01", 1) }
        )
    ).to.be.revertedWith("InvalidProof");

    // check cost
    await expect(
      contract
        .connect(rareMinter)
        .mint(2,
          merkleTree.getHexProof(keccak256(await rareMinter.getAddress())),
          "",
          { value: getPrice("0.009", 1) }
        )
    ).to.be.revertedWith("InsufficientFunds");

    // minting success
    await contract
      .connect(rareMinter)
      .mint(2,
        merkleTree.getHexProof(keccak256(await rareMinter.getAddress())),
        "", // this is metadata input CID from IPFS
        { value: getPrice("0.01", 1) }
      );

    // try to mint again
    await expect(
      contract
        .connect(rareMinter)
        .mint(2,
          merkleTree.getHexProof(keccak256(await rareMinter.getAddress())),
          "",
          { value: getPrice("0.01", 1) }
        )
    ).to.be.revertedWith("ExceedeedTokenClaiming");

    // check supply
    expect((await contract.avatar(2)).minted).to.equal(2);
    expect(await contract.totalSupply()).to.be.equal(3);

    // check balance
    expect(await contract.balanceOf(await owner.getAddress())).to.equal(0);
    expect(await contract.balanceOf(await legendaryMinter.getAddress())).to.equal(1);
    expect(await contract.balanceOf(await epicMinter.getAddress())).to.equal(1);
    expect(await contract.balanceOf(await rareMinter.getAddress())).to.equal(1);
  });

  it("Token URI generation", async function () {
    // assume the metadata is located in CID bellow
    // const uriPrefix = "ipfs://QmPheZWCLHygMQLQiRVmAWD4YZBcgLndC1V3ZGVW8AECkW/";
    // const uriSuffix = ".json";
    const tokenAlreadyMinted = await contract.totalSupply();

    // Testing first and last minted tokens
    for (let i = 1; i <= tokenAlreadyMinted; i++) {
      expect(await contract.tokenURI(i)).to.equal(
        //`${uriPrefix}${i}${uriSuffix}`
        ""
      );
    }

    // keep tracking that there is no token ID = 0
    await expect(contract.tokenURI(0)).to.be.revertedWith("ERC721: invalid token ID");
  });

  it("Withdraw", async function () {
    // success
    await contract.connect(owner).withdraw();

    // error = balance is 0
    await expect(contract.connect(owner).withdraw()).to.be.revertedWith(
      "InsufficientFunds"
    );
  });
});