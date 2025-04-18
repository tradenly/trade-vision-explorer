
import { FeeService } from '../dex/services/FeeService';

export class ArbitrageProfitService {
  private static instance: ArbitrageProfitService;
  private feeService: FeeService;

  private constructor() {
    this.feeService = FeeService.getInstance();
  }

  public static getInstance(): ArbitrageProfitService {
    if (!ArbitrageProfitService.instance) {
      ArbitrageProfitService.instance = new ArbitrageProfitService();
    }
    return ArbitrageProfitService.instance;
  }

  /**
   * Calculate estimated profit from buying on one DEX and selling on another
   */
  public calculateEstimatedProfit(
    buyPrice: number,
    sellPrice: number,
    investmentAmount: number,
    buyDex: string,
    sellDex: string,
    gasFee: number
  ): {
    estimatedProfit: number;
    estimatedProfitPercentage: number;
    tradingFees: number;
    platformFee: number;
  } {
    const tradingFees = this.feeService.calculateTradingFees(
      investmentAmount,
      buyDex,
      sellDex
    );

    const platformFee = this.feeService.calculatePlatformFee(investmentAmount);
    
    // Amount of tokens purchased (accounting for buy price and buy fee)
    const tokensAmount = investmentAmount / buyPrice;
    
    // Gross proceeds from selling tokens
    const sellProceeds = tokensAmount * sellPrice;
    
    // Estimated profit before fees
    const grossProfit = sellProceeds - investmentAmount;
    
    // Estimated profit after fees
    const estimatedProfit = grossProfit - gasFee - tradingFees - platformFee;
    
    // Profit as a percentage of investment
    const estimatedProfitPercentage = (estimatedProfit / investmentAmount) * 100;
    
    return {
      estimatedProfit,
      estimatedProfitPercentage,
      tradingFees,
      platformFee
    };
  }

  /**
   * Calculate net profit after slippage and all fees
   */
  public calculateNetProfit(
    buyPrice: number,
    sellPrice: number,
    tradeAmount: number,
    tradingFees: number,
    platformFee: number,
    gasFees: number
  ): {
    netProfit: number;
    netProfitPercentage: number;
  } {
    // Calculate actual token amount bought
    const tokenAmount = tradeAmount / buyPrice;
    
    // Calculate sale proceeds
    const sellProceeds = tokenAmount * sellPrice;
    
    // Calculate net profit after all fees
    const netProfit = sellProceeds - tradeAmount - tradingFees - platformFee - gasFees;
    
    // Calculate profit percentage
    const netProfitPercentage = (netProfit / tradeAmount) * 100;
    
    return {
      netProfit,
      netProfitPercentage
    };
  }
}
