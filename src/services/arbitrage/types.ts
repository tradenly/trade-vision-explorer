
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';

export interface ArbitrageScanParams {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  minProfitPercentage?: number;
  investmentAmount?: number;
}

export interface ArbitrageScanResult {
  opportunities: ArbitrageOpportunity[];
  errors: string[];
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
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  timestamp: number;
  buyGasFee: number;
  sellGasFee: number;
  tradingFees: number;
  platformFee: number;
  investmentAmount: number;
  // Add the missing properties
  buyPriceImpact?: number;
  sellPriceImpact?: number;
  adjustedBuyPrice?: number;
  adjustedSellPrice?: number;
}
