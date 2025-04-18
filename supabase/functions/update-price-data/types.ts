
export interface TokenPair {
  baseToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  quoteToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

export interface PriceData {
  token_pair: string;
  price: number;
  chain_id: number;
  dex_name: string;
  timestamp: string;
  liquidity: number;
}

export interface DexSettings {
  name: string;
  chain_ids: number[];
  enabled: boolean;
}
