
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

export interface ArbitrageRequest {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  minProfitPercentage?: number;
  investmentAmount?: number;
  maxAgeSeconds?: number;
}

export interface PriceData {
  dex_name: string;
  token_pair: string;
  price: number;
  chain_id: number;
  timestamp: string;
  liquidity?: number;
}

export interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  token: string;
  baseToken?: TokenInfo;
  quoteToken?: TokenInfo;
  network: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceGap: number;
  priceGapPercentage: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  tradingFees: number;
  networkFees: number;
  platformFee: number;
  totalFees: number;
  netProfit: number;
  netProfitPercentage: number;
  investmentAmount: number;
  liquidity: number;
  buyDexPriceData?: PriceData;
  sellDexPriceData?: PriceData;
}
