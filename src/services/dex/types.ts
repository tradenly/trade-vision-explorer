
import { TokenInfo } from '../tokenListService';

export interface PriceQuote {
  dexName: string;
  price: number;
  fees: number; // in percentage
  liquidityInfo?: any; // Added to support additional liquidity information
}

export interface DexConfig {
  name: string;
  slug: string;
  chainIds: number[]; // Which chains this DEX supports
  tradingFeePercentage: number;
  enabled: boolean;
}

export interface ArbitrageOpportunityDetails {
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  buyLiquidity: number;
  sellLiquidity: number;
  gasFee: number;
  tradingFees: number;
  platformFee: number; // Tradenly's 0.5% fee
  estimatedProfit: number;
  estimatedProfitPercentage: number;
}

export interface DexAdapter {
  getName(): string;
  getSupportedChains(): number[];
  fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount?: number): Promise<PriceQuote>;
  getTradingFeePercentage(): number;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}
