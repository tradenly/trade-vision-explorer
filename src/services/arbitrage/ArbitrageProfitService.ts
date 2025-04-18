
import { calculateTradingFees, calculatePlatformFee } from './utils';

export class ArbitrageProfitService {
  private static instance: ArbitrageProfitService;

  private constructor() {}

  public static getInstance(): ArbitrageProfitService {
    if (!ArbitrageProfitService.instance) {
      ArbitrageProfitService.instance = new ArbitrageProfitService();
    }
    return ArbitrageProfitService.instance;
  }

  /**
   * Calculate the estimated profit for an arbitrage opportunity
   */
  public calculateEstimatedProfit(
    buyPrice: number,
    sellPrice: number,
    tradeAmount: number,
    buyDex: string,
    sellDex: string,
    gasFee: number
  ): {
    estimatedProfit: number;
    estimatedProfitPercentage: number;
    tradingFees: number;
    platformFee: number;
  } {
    // Calculate potential gross revenue (not accounting for slippage)
    const baseTokenAmount = tradeAmount / buyPrice;
    const grossProceeds = baseTokenAmount * sellPrice;
    const estimatedProfit = grossProceeds - tradeAmount;
    
    // Calculate fees
    const tradingFees = calculateTradingFees(tradeAmount, buyDex, sellDex);
    const platformFee = calculatePlatformFee(tradeAmount);
    
    // Calculate profit percentage
    const estimatedProfitPercentage = (estimatedProfit / tradeAmount) * 100;
    
    return {
      estimatedProfit,
      estimatedProfitPercentage,
      tradingFees,
      platformFee
    };
  }

  /**
   * Calculate the net profit after all fees and slippage
   */
  public calculateNetProfit(
    adjustedBuyPrice: number,
    adjustedSellPrice: number,
    tradeAmount: number,
    tradingFees: number,
    platformFee: number,
    gasFee: number
  ): {
    netProfit: number;
    netProfitPercentage: number;
  } {
    // Calculate tokens purchased with slippage
    const tokensReceived = tradeAmount / adjustedBuyPrice;
    
    // Calculate proceeds with slippage
    const proceeds = tokensReceived * adjustedSellPrice;
    
    // Calculate net profit
    const netProfit = proceeds - tradeAmount - tradingFees - platformFee - gasFee;
    
    // Calculate net profit percentage
    const netProfitPercentage = (netProfit / tradeAmount) * 100;
    
    return {
      netProfit,
      netProfitPercentage
    };
  }
}
