import CollectionConfigInterface from "../lib/CollectionConfigInterface";
import * as Networks from "../lib/Networks";
//import * as Marketpalce from "../lib/Marketplaces";

const CollectionConfig: CollectionConfigInterface = {
    testnet: Networks.arbitrumGoerli,
    mainnet: Networks.arbitrumOne,
    contractName: "LevyContract",
    tokenName: "Testing Diamond Token",
    tokenSymbol: "TDT",
    contractAddress: "0x52c4B82d4c47CF0eFd304b747c72D0C451db1a7f",
    //marketplaceIdentifier: "market-place-identifier",
    //marketplaceConfig: Marketpalce.openSea
};

export default CollectionConfig;