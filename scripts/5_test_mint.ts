// import { MerkleTree } from "merkletreejs";
// import keccak256 from "keccak256";
import { ethers } from "hardhat";
import keccak256 from "keccak256";
import NftContractProvider from "../lib/NftContractProvider";

async function main() {
  const [owner] = await ethers.getSigners();

  // attach to deploy contract
  const contract = await NftContractProvider.getContract();
  const abiCoder = new ethers.utils.AbiCoder();

  const docType = "E-CERTIFICATE";
  const hashDocType = keccak256(abiCoder.encode(["string"], [docType]));

  const voucher = `{
  "serialNumber": "123e4567-e89b-12d3-a456-426614174000cczzzc1",
  "signerIdentity": "5d41402abc4b2a76b9719d911017c592",
  "issueTimestamp": "2023-11-14T09:15:30Z",
  "signatureTimestamp": "2023-11-14T10:00:00Z",
  "documentHash": "e4d909c290d0fb1ca068ffaddf22cbd0",
  "documentPath": "/storage/path.pdf",
  "algorithm": "RSA-2048",
  "certificateProvider": "BSrE Kominfo",
  "validFrom": "2023-11-14T09:15:30Z",
  "validTo": "2025-11-14T09:15:30Z",
  "providerSignature": "MEUCIQDYr+4DqJh...3Lg4dxhQkM2Af",
  "certificateStatus": "aktif",
  "revocationReason": null
}`;

  const voucherHash = keccak256(abiCoder.encode(["string"], [voucher]));
  await contract.connect(owner).mintData(voucherHash, hashDocType, voucher);
  
  console.log("Done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
