import { AssetContract as ContractType } from '../typechain-types/index';

import { ethers, network } from "hardhat";
import CollectionConfig from "./../config/CollectionConfig";

export default class NftContractProvider {
    public static async getContract(): Promise<ContractType> {
        let Address = network.config.chainId == 1337 ? CollectionConfig.contractLocal : CollectionConfig.contractAddress;
        // Check configuration
        if (null === Address) {
        throw '\x1b[31merror\x1b[0m ' + 'Please add the contract address to the configuration before running this command.';
        }

        if (await ethers.provider.getCode(Address) === '0x') {
        throw '\x1b[31merror\x1b[0m ' + `Can't find a contract deployed to the target address: ${Address}`;
        }

        const [owner] = await ethers.getSigners();
        
        return await ethers.getContractAt(CollectionConfig.contractName, Address, owner) as unknown as ContractType;
    }
};
  
export type NftContractType = ContractType;