
export interface PriceResult {
  source: string;        // Name of DEX/source
  price: number;         // Token price
  timestamp: number;     // Timestamp when price was fetched
  liquidity: number;     // Liquidity in USD
  tradingFee: number;    // Trading fee as decimal (e.g., 0.003 = 0.3%)
  isFallback?: boolean;  // Flag for fallback data
  isMock?: boolean;      // Flag for mock data
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
