
import { TokenInfo } from '../tokenListService';
import { ArbitrageOpportunity } from './types';
import { getNetworkName } from './utils';

export class ArbitrageOpportunityBuilder {
  private static instance: ArbitrageOpportunityBuilder;

  private constructor() {}

  public static getInstance(): ArbitrageOpportunityBuilder {
    if (!ArbitrageOpportunityBuilder.instance) {
      ArbitrageOpportunityBuilder.instance = new ArbitrageOpportunityBuilder();
    }
    return ArbitrageOpportunityBuilder.instance;
  }

  /**
   * Create an arbitrage opportunity object with all required fields
   */
  public createOpportunity(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    buyDex: string,
    sellDex: string,
    buyPrice: number,
    sellPrice: number,
    priceDifferencePercentage: number,
    liquidity: number,
    estimatedProfit: number,
    estimatedProfitPercentage: number,
    gasFee: number,
    netProfit: number,
    netProfitPercentage: number,
    tradingFees: number,
    platformFee: number,
    investmentAmount: number,
    buyPriceImpact: number,
    sellPriceImpact: number,
    adjustedBuyPrice: number,
    adjustedSellPrice: number
  ): ArbitrageOpportunity {
    const network = getNetworkName(baseToken.chainId);

    return {
      id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
      tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
      token: baseToken.symbol,
      network,
      buyDex,
      sellDex,
      buyPrice,
      sellPrice,
      priceDifferencePercentage,
      liquidity,
      estimatedProfit,
      estimatedProfitPercentage,
      gasFee,
      netProfit,
      netProfitPercentage,
      baseToken,
      quoteToken,
      timestamp: Date.now(),
      buyGasFee: gasFee * 0.6,  // 60% for buy operation
      sellGasFee: gasFee * 0.4,  // 40% for sell operation
      tradingFees,
      platformFee,
      investmentAmount,
      buyPriceImpact,
      sellPriceImpact,
      adjustedBuyPrice,
      adjustedSellPrice
    };
  }
}
