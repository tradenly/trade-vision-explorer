
export interface PriceResult {
  source: string;
  price: number;
  liquidity: number;
  timestamp: number;
  tradingFee?: number;
}

export interface TokenPair {
  baseToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
  quoteToken: {
    address: string;  
    symbol: string;
    decimals: number;
    chainId: number;
  };
}

export interface DexAdapter {
  getName(): string;
  getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null>;
}
