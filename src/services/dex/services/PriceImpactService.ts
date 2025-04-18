
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';

/**
 * Service to calculate price impact of trades and slippage
 */
export class PriceImpactService {
  private static instance: PriceImpactService;

  private constructor() {}

  public static getInstance(): PriceImpactService {
    if (!PriceImpactService.instance) {
      PriceImpactService.instance = new PriceImpactService();
    }
    return PriceImpactService.instance;
  }

  /**
   * Calculate price impact for a token trade
   * @param tradeAmount Amount being traded in USD
   * @param liquidityUSD Available liquidity in USD
   * @returns Price impact percentage (0-100)
   */
  public calculatePriceImpact(tradeAmount: number, liquidityUSD: number): number {
    if (!liquidityUSD || liquidityUSD <= 0) {
      return 5; // Default to 5% if liquidity is unknown
    }
    
    // Simple square root formula for price impact
    // Lower impact with higher liquidity, higher impact with larger trade size
    const impact = (Math.sqrt(tradeAmount) / Math.sqrt(liquidityUSD)) * 100;
    
    // Cap at reasonable limits
    return Math.min(Math.max(impact, 0.01), 10);
  }

  /**
   * Get effective buy price including impact
   * @param basePrice Base price before slippage
   * @param priceImpact Price impact percentage (0-100)
   * @returns Price after impact
   */
  public getEffectiveBuyPrice(basePrice: number, priceImpact: number): number {
    // When buying, price increases due to slippage
    return basePrice * (1 + (priceImpact / 100));
  }

  /**
   * Get effective sell price including impact
   * @param basePrice Base price before slippage
   * @param priceImpact Price impact percentage (0-100)
   * @returns Price after impact
   */
  public getEffectiveSellPrice(basePrice: number, priceImpact: number): number {
    // When selling, price decreases due to slippage
    return basePrice * (1 - (priceImpact / 100));
  }

  /**
   * Calculate max trade size based on available liquidity
   * @param liquidity Available liquidity in USD
   * @returns Maximum recommended trade size in USD
   */
  public calculateMaxTradeSize(liquidity: number): number {
    if (!liquidity || liquidity <= 0) {
      return 1000; // Default safe value
    }
    
    // Generally safe to use up to 3% of liquidity without major impact
    return liquidity * 0.03;
  }

  /**
   * Validate if a trade size is safe for available liquidity
   * @param tradeAmount Amount being traded in USD
   * @param liquidityUSD Available liquidity in USD
   * @param maxImpactPercentage Maximum acceptable price impact
   * @returns Object with validation results
   */
  public validateTradeSize(
    tradeAmount: number, 
    liquidityUSD: number, 
    maxImpactPercentage: number = 3
  ): { 
    isValid: boolean;
    priceImpact: number; 
    maxRecommendedAmount: number;
  } {
    const priceImpact = this.calculatePriceImpact(tradeAmount, liquidityUSD);
    const maxRecommendedAmount = this.calculateMaxTradeSize(liquidityUSD);
    
    return {
      isValid: priceImpact <= maxImpactPercentage,
      priceImpact,
      maxRecommendedAmount
    };
  }
  
  /**
   * Calculate slippage adjusted prices for buy and sell orders
   * @param buyPrice Original buy price
   * @param sellPrice Original sell price
   * @param buyLiquidity Liquidity on buy DEX
   * @param sellLiquidity Liquidity on sell DEX
   * @param tradeAmount Amount being traded in USD
   * @returns Object with adjusted prices and impacts
   */
  public calculateSlippageAdjustedPrices(
    buyPrice: number,
    sellPrice: number,
    buyLiquidity: number,
    sellLiquidity: number,
    tradeAmount: number
  ): {
    adjustedBuyPrice: number;
    adjustedSellPrice: number;
    buyPriceImpact: number;
    sellPriceImpact: number;
    isProfitableAfterSlippage: boolean;
  } {
    const buyPriceImpact = this.calculatePriceImpact(tradeAmount, buyLiquidity);
    const sellPriceImpact = this.calculatePriceImpact(tradeAmount, sellLiquidity);
    
    const adjustedBuyPrice = this.getEffectiveBuyPrice(buyPrice, buyPriceImpact);
    const adjustedSellPrice = this.getEffectiveSellPrice(sellPrice, sellPriceImpact);
    
    return {
      adjustedBuyPrice,
      adjustedSellPrice,
      buyPriceImpact,
      sellPriceImpact,
      isProfitableAfterSlippage: adjustedSellPrice > adjustedBuyPrice
    };
  }
}
