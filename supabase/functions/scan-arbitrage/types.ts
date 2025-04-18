
export interface ArbitrageRequest {
  baseToken: {
    symbol: string;
    address: string;
    chainId: number;
  };
  quoteToken: {
    symbol: string;
    address: string;
    chainId: number;
  };
  minProfitPercentage?: number;
  investmentAmount?: number;
  maxAgeSeconds?: number;
}

export interface PriceData {
  dex_name: string;
  price: number;
  liquidity: number;
  timestamp: string;
}

export interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  token: string;
  network: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceDifferencePercentage: number;
  liquidity: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  gasFee: number;
  netProfit: number;
  netProfitPercentage: number;
  baseToken: any;
  quoteToken: any;
  timestamp: number;
  buyGasFee: number;
  sellGasFee: number;
  tradingFees: number;
  platformFee: number;
  investmentAmount: number;
}
