
import { TokenInfo } from '../tokenListService';
import { ArbitrageOpportunity } from './types';
import { PriceQuote } from '../dex/types';
import { getNetworkName } from './utils';
import { FeeService } from '../dex/services/FeeService';
import { PriceCalculationService } from './PriceCalculationService';
import { ArbitrageProfitService } from './ArbitrageProfitService';
import { ArbitrageOpportunityBuilder } from './ArbitrageOpportunityBuilder';

export class ArbitrageOpportunityService {
  private static instance: ArbitrageOpportunityService;
  private feeService: FeeService;
  private priceCalculationService: PriceCalculationService;
  private profitService: ArbitrageProfitService;
  private opportunityBuilder: ArbitrageOpportunityBuilder;

  private constructor() {
    this.feeService = FeeService.getInstance();
    this.priceCalculationService = PriceCalculationService.getInstance();
    this.profitService = ArbitrageProfitService.getInstance();
    this.opportunityBuilder = ArbitrageOpportunityBuilder.getInstance();
  }

  public static getInstance(): ArbitrageOpportunityService {
    if (!ArbitrageOpportunityService.instance) {
      ArbitrageOpportunityService.instance = new ArbitrageOpportunityService();
    }
    return ArbitrageOpportunityService.instance;
  }

  /**
   * Find arbitrage opportunities from price quotes
   */
  public findOpportunities(
    quotes: Record<string, PriceQuote>,
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    minProfitPercentage: number = 0.5,
    investmentAmount: number = 1000,
    networkName?: string,
    gasEstimate?: number,
    approvalGasEstimate?: number
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const dexes = Object.keys(quotes);
    const network = networkName || getNetworkName(baseToken.chainId);
    
    // Default gas estimates if not provided
    const gasFee = gasEstimate || 0.1;
    
    // Compare each pair of DEXes
    for (let i = 0; i < dexes.length; i++) {
      for (let j = 0; j < dexes.length; j++) {
        // Skip comparing the same DEX
        if (i === j) continue;
        
        const buyDex = dexes[i];
        const sellDex = dexes[j];
        const buyQuote = quotes[buyDex];
        const sellQuote = quotes[sellDex];
        
        // Skip if either quote is invalid or missing
        if (!buyQuote || !buyQuote.price || !sellQuote || !sellQuote.price) continue;
        
        // Calculate price difference
        const priceDiff = sellQuote.price - buyQuote.price;
        const priceDiffPercentage = (priceDiff / buyQuote.price) * 100;
        
        // Skip if the price difference is too small
        if (priceDiffPercentage < minProfitPercentage) continue;
        
        // Check for sufficient liquidity
        const buyLiquidity = buyQuote.liquidityUSD || 100000;
        const sellLiquidity = sellQuote.liquidityUSD || 100000;
        const minLiquidity = Math.min(buyLiquidity, sellLiquidity);
        
        if (minLiquidity < investmentAmount * 3) continue; // Require 3x coverage
        
        // Calculate slippage and price impact
        const slippageInfo = this.priceCalculationService.calculateSlippageAdjustedPrices(
          buyQuote.price, 
          sellQuote.price,
          buyLiquidity,
          sellLiquidity,
          investmentAmount
        );
        
        // Skip if not profitable after slippage
        if (!slippageInfo.isProfitableAfterSlippage) continue;
        
        // Calculate estimated profit and fees
        const profitInfo = this.profitService.calculateEstimatedProfit(
          buyQuote.price,
          sellQuote.price,
          investmentAmount,
          buyDex,
          sellDex,
          gasFee
        );
        
        // Calculate net profit after all fees and slippage
        const netProfitInfo = this.profitService.calculateNetProfit(
          slippageInfo.adjustedBuyPrice,
          slippageInfo.adjustedSellPrice,
          investmentAmount,
          profitInfo.tradingFees,
          profitInfo.platformFee,
          gasFee
        );
        
        // Only include profitable opportunities after all fees
        if (netProfitInfo.netProfitPercentage >= minProfitPercentage) {
          const opportunity = this.opportunityBuilder.createOpportunity(
            baseToken,
            quoteToken,
            buyDex,
            sellDex,
            buyQuote.price,
            sellQuote.price,
            priceDiffPercentage,
            minLiquidity,
            profitInfo.estimatedProfit,
            profitInfo.estimatedProfitPercentage,
            gasFee,
            netProfitInfo.netProfit,
            netProfitInfo.netProfitPercentage,
            profitInfo.tradingFees,
            profitInfo.platformFee,
            investmentAmount,
            slippageInfo.buyPriceImpact,
            slippageInfo.sellPriceImpact,
            slippageInfo.adjustedBuyPrice,
            slippageInfo.adjustedSellPrice
          );
          
          opportunities.push(opportunity);
        }
      }
    }

    // Sort by profit percentage from highest to lowest
    return opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
  }
}
