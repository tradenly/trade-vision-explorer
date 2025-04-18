
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { PriceQuote } from '@/services/dex/types';
import { getNetworkName, calculateTradingFees, calculatePlatformFee } from './utils';
import { FeeService } from '@/services/dex/services/FeeService';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';

export class ArbitrageOpportunityService {
  private static instance: ArbitrageOpportunityService;
  private feeService: FeeService;
  private priceImpactService: PriceImpactService;

  private constructor() {
    this.feeService = FeeService.getInstance();
    this.priceImpactService = PriceImpactService.getInstance();
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
    const approvalGas = approvalGasEstimate || 0.05;

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
        const slippageInfo = this.priceImpactService.calculateSlippageAdjustedPrices(
          buyQuote.price, 
          sellQuote.price,
          buyLiquidity,
          sellLiquidity,
          investmentAmount
        );
        
        // Skip if not profitable after slippage
        if (!slippageInfo.isProfitableAfterSlippage) continue;
        
        // Trading fees (DEX fees)
        const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
        
        // Platform fee (Tradenly's fee)
        const platformFee = calculatePlatformFee(investmentAmount);
        
        // Calculate gross profit (before fees)
        const totalTokensBought = investmentAmount / slippageInfo.adjustedBuyPrice;
        const grossProceeds = totalTokensBought * slippageInfo.adjustedSellPrice;
        const estimatedProfit = grossProceeds - investmentAmount;
        
        // Calculate net profit after all fees
        const netProfit = estimatedProfit - tradingFees - platformFee - gasFee;
        const netProfitPercentage = (netProfit / investmentAmount) * 100;
        
        // Only include profitable opportunities after all fees
        if (netProfitPercentage >= minProfitPercentage) {
          opportunities.push({
            id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
            tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
            token: baseToken.symbol,
            network,
            buyDex,
            sellDex,
            buyPrice: buyQuote.price,
            sellPrice: sellQuote.price,
            priceDifferencePercentage: priceDiffPercentage,
            liquidity: minLiquidity,
            estimatedProfit,
            estimatedProfitPercentage: priceDiffPercentage,
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
            buyPriceImpact: slippageInfo.buyPriceImpact,
            sellPriceImpact: slippageInfo.sellPriceImpact,
            adjustedBuyPrice: slippageInfo.adjustedBuyPrice,
            adjustedSellPrice: slippageInfo.adjustedSellPrice
          });
        }
      }
    }

    // Sort by profit percentage from highest to lowest
    return opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
  }
}
