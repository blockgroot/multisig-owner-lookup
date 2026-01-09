export const SAFE_NETWORKS: Record<string, string> = {
    ethereum: "https://api.safe.global/tx-service/eth",
    polygon: "https://api.safe.global/tx-service/pol",
    optimism: "https://api.safe.global/tx-service/oeth",
    bnb: "https://api.safe.global/tx-service/bnb",
    arbitrum: "https://api.safe.global/tx-service/arb1",
    gnosis: "https://api.safe.global/tx-service/gno",
    xlaychain: "https://api.safe.global/tx-service/okb",
  };

// Mapping from network name to chainId
export const NETWORK_TO_CHAIN_ID: Record<string, number> = {
    ethereum: 1,
    polygon: 137,
    optimism: 10,
    bnb: 56,
    arbitrum: 42161,
    gnosis: 100,
    xlaychain: 196,
  };

// Mapping from network name to Safe app URL prefix
export const NETWORK_TO_SAFE_APP: Record<string, string> = {
    ethereum: "eth",
    polygon: "matic",
    optimism: "oeth",
    bnb: "bnb",
    arbitrum: "arb1",
    gnosis: "gno",
    xlaychain: "okb",
  };
  