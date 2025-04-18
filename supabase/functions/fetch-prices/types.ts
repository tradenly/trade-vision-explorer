
/**
 * DEX adapter interface
 */
export interface DexAdapter {
  getName(): string;
  getPrice(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    chainId: number
  ): Promise<PriceResult | null>;
}

/**
 * Token type
 */
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
}

/**
 * Token pair for price fetching
 */
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

/**
 * Price result from DEX
 */
export interface PriceResult {
  source: string;
  price: number;
  liquidity: number;
  timestamp: number;
  tradingFee: number;
}
