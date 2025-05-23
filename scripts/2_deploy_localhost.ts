import { ethers } from "hardhat";
import CollectionConfig from "../config/CollectionConfig";
import { NftContractType } from "../lib/NftContractProvider";
import ContractArguments from "../config/ContractArguments";

async function main() {

  console.log("Deploying contract..");

  // We get the contract to deploy
  const Contract = await ethers.getContractFactory(CollectionConfig.contractName);
  const contract = await Contract.deploy(...ContractArguments) as unknown as NftContractType;

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);

  console.log("Setup and verify document types...");
  await contract.approveDocType("LEVY");
  await contract.approveDocType("E-CERTIFICATE");

  const [owner] = await ethers.getSigners();
  console.log("Setup address for development for address", owner.address);
  await contract.setApproveClient(await owner.getAddress(), true);
  console.log("Done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});