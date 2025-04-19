
export interface PriceResult {
  source: string;
  price: number;
  timestamp: number;
  liquidity: number;
  tradingFee: number;
  isFallback?: boolean;
}

export interface TokenPair {
  baseToken: {
    address: string;
    symbol: string;
    decimals?: number;
    chainId: number;
  };
  quoteToken: {
    address: string;
    symbol: string;
    decimals?: number;
    chainId: number;
  };
}

export interface DexAdapter {
  getName(): string;
  getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null>;
}
