
export interface PriceResult {
  source: string;
  price: number;
  timestamp: number;
  liquidity: number;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
}
