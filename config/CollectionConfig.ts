import CollectionConfigInterface from "../lib/CollectionConfigInterface";
import * as Networks from "../lib/Networks";
//import * as Marketpalce from "../lib/Marketplaces";

const CollectionConfig: CollectionConfigInterface = {
    testnet: Networks.polygonTestnet,
    mainnet: Networks.arbitrumOne,
    contractName: "LevyContract",
    tokenName: "Levy Voucher Qr",
    tokenSymbol: "LVQ",
    contractAddress: "0x17A101F41aA7056818D686D779A11D8F7F5354b3",
    //marketplaceIdentifier: "market-place-identifier",
    //marketplaceConfig: Marketpalce.openSea
};

export default CollectionConfig;