import CollectionConfigInterface from "../lib/CollectionConfigInterface";
import * as Networks from "../lib/Networks";
//import * as Marketpalce from "../lib/Marketplaces";

const CollectionConfig: CollectionConfigInterface = {
    testnet: Networks.niskala,
    mainnet: Networks.arbitrumOne,
    contractName: "AssetContract",
    tokenName: "Data Asset Digital",
    tokenSymbol: "DAD",
    tokenUri: "https://ipfs.io/ipfs/bafkreignrcvv2cwzpgmhpedqg7qpu6cp6qcixbi2ujzskcqkmeauud2rza",
    contractAddress: "0x499286f97CD0C925338b705e87dBd1465a8d61e1",
};

export default CollectionConfig;