import CollectionConfigInterface from "../lib/CollectionConfigInterface";
import * as Networks from "../lib/Networks";
//import * as Marketpalce from "../lib/Marketplaces";

const CollectionConfig: CollectionConfigInterface = {
    testnet: Networks.niskala,
    mainnet: Networks.arbitrumOne,
    contractName: "LevyContract",
    tokenName: "Levy Voucher Qr",
    tokenSymbol: "LVQ",
    contractAddress: "0x49EAF5D324f3ff46c7fe5E5532A1D287eb00664E",
    //marketplaceIdentifier: "market-place-identifier",
    //marketplaceConfig: Marketpalce.openSea
};

export default CollectionConfig;