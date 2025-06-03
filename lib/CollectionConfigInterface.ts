import NetworkConfigInterface from "./NetworkConfigInterface";
//import MarketplaceConfigInterface from "./MarketplaceConfigInterface";

export default interface CollectionConfigInterface {
    testnet: NetworkConfigInterface;
    mainnet: NetworkConfigInterface;
    contractName: string;
    tokenName: string;
    tokenSymbol: string;
    tokenUri: string;
    contractAddress: string|null;
    //marketplaceIdentifier: string;
    //marketplaceConfig: MarketplaceConfigInterface;
};