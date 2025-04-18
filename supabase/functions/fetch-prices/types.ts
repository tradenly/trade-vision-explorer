
export interface PriceResult {
  price: number;
  liquidity: number;
  volume: number;
  source: string;
  timestamp: number;
}

export interface DexAdapter {
  getPrice(baseToken: string, quoteToken: string, chainId: number): Promise<PriceResult | null>;
}

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
  chainId: number;
}
