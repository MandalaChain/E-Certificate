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
    contractAddress: "0x15D418654401315a2beD413ce8f558881f399208",
};

export default CollectionConfig;