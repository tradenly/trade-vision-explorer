
import { PriceQuote } from '../types';
import { PriceImpactService } from './PriceImpactService';

export class TradeProfitabilityService {
  private static instance: TradeProfitabilityService;
  private priceImpactService: PriceImpactService;
  private readonly PLATFORM_FEE_PERCENTAGE = 0.5; // 0.5% platform fee

  private constructor() {
    this.priceImpactService = PriceImpactService.getInstance();
  }

  public static getInstance(): TradeProfitabilityService {
    if (!TradeProfitabilityService.instance) {
      TradeProfitabilityService.instance = new TradeProfitabilityService();
    }
    return TradeProfitabilityService.instance;
  }

  /**
   * Calculate expected profit from an arbitrage trade
   * @param tradeAmount Amount being traded in USD
   * @param buyQuote Buy price quote
   * @param sellQuote Sell price quote
   * @param buyImpact Price impact for buy transaction
   * @param sellImpact Price impact for sell transaction
   * @param gasEstimate Gas cost estimate in USD
   * @returns Expected profit in USD
   */
  public calculateExpectedProfit(
    tradeAmount: number,
    buyQuote: PriceQuote,
    sellQuote: PriceQuote,
    buyImpact: number,
    sellImpact: number,
    gasEstimate: number
  ): number {
    const effectiveBuyPrice = this.priceImpactService.getEffectiveBuyPrice(buyQuote.price, buyImpact);
    const effectiveSellPrice = this.priceImpactService.getEffectiveSellPrice(sellQuote.price, sellImpact);

    const baseTokenAmount = tradeAmount / effectiveBuyPrice;
    const expectedReturn = baseTokenAmount * effectiveSellPrice;
    const tradingFees = (buyQuote.fees || 0.003) * tradeAmount + (sellQuote.fees || 0.003) * expectedReturn;
    
    return expectedReturn - tradeAmount - tradingFees - gasEstimate;
  }
  
  /**
   * Calculate platform fee for a trade
   * @param tradeAmount Amount being traded in USD
   * @returns Platform fee in USD
   */
  public calculatePlatformFee(tradeAmount: number): number {
    return (this.PLATFORM_FEE_PERCENTAGE / 100) * tradeAmount;
  }
  
  /**
   * Calculate net profit after all fees
   * @param grossProfit Gross profit from trade
   * @param tradingFees DEX trading fees
   * @param gasEstimate Gas cost estimate
   * @param tradeAmount Original trade amount (for platform fee calculation)
   * @returns Net profit after all fees
   */
  public calculateNetProfit(
    grossProfit: number,
    tradingFees: number,
    gasEstimate: number,
    tradeAmount: number
  ): number {
    const platformFee = this.calculatePlatformFee(tradeAmount);
    return grossProfit - tradingFees - gasEstimate - platformFee;
  }
  
  /**
   * Calculate if a trade is profitable considering all fees and slippage
   * @param buyPrice Buy price including impact
   * @param sellPrice Sell price including impact
   * @param tradeAmount Amount being traded in USD
   * @param tradingFees Combined trading fees
   * @param gasEstimate Gas fees
   * @returns Object with profit information
   */
  public analyzeTradeProfitability(
    buyPrice: number,
    sellPrice: number,
    tradeAmount: number,
    tradingFees: number,
    gasEstimate: number
  ): { 
    isViable: boolean,
    grossProfit: number, 
    platformFee: number, 
    netProfit: number, 
    profitPercentage: number 
  } {
    const baseTokenAmount = tradeAmount / buyPrice;
    const expectedReturn = baseTokenAmount * sellPrice;
    const grossProfit = expectedReturn - tradeAmount;
    
    const platformFee = this.calculatePlatformFee(tradeAmount);
    const netProfit = grossProfit - tradingFees - gasEstimate - platformFee;
    const profitPercentage = (netProfit / tradeAmount) * 100;
    
    return {
      isViable: netProfit > 0,
      grossProfit,
      platformFee,
      netProfit,
      profitPercentage
    };
  }
}
