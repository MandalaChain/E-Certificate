import CollectionConfigInterface from "../lib/CollectionConfigInterface";
import * as Networks from "../lib/Networks";
//import * as Marketpalce from "../lib/Marketplaces";

const CollectionConfig: CollectionConfigInterface = {
    testnet: Networks.niskala,
    mainnet: Networks.arbitrumOne,
    contractName: "AssetContract",
    tokenName: "Data Asset Digital",
    tokenSymbol: "DAD",
    contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    //marketplaceIdentifier: "market-place-identifier",
    //marketplaceConfig: Marketpalce.openSea
};

export default CollectionConfig;