
import { PriceImpactService } from '../dex/services/PriceImpactService';

export class PriceCalculationService {
  private static instance: PriceCalculationService;
  private priceImpactService: PriceImpactService;

  private constructor() {
    this.priceImpactService = PriceImpactService.getInstance();
  }

  public static getInstance(): PriceCalculationService {
    if (!PriceCalculationService.instance) {
      PriceCalculationService.instance = new PriceCalculationService();
    }
    return PriceCalculationService.instance;
  }

  /**
   * Calculate slippage-adjusted prices based on trade size and liquidity
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
    // Calculate price impact (simplified formula)
    const buyPriceImpact = this.calculatePriceImpact(tradeAmount, buyLiquidity);
    const sellPriceImpact = this.calculatePriceImpact(tradeAmount, sellLiquidity);

    // Adjust prices based on impact
    const adjustedBuyPrice = this.priceImpactService.getEffectiveBuyPrice(buyPrice, buyPriceImpact);
    const adjustedSellPrice = this.priceImpactService.getEffectiveSellPrice(sellPrice, sellPriceImpact);

    // Check if still profitable after slippage
    const isProfitableAfterSlippage = adjustedSellPrice > adjustedBuyPrice;

    return {
      adjustedBuyPrice,
      adjustedSellPrice,
      buyPriceImpact,
      sellPriceImpact,
      isProfitableAfterSlippage
    };
  }

  /**
   * Calculate price impact based on trade size and liquidity
   */
  private calculatePriceImpact(tradeAmount: number, liquidity: number): number {
    if (!liquidity || liquidity === 0) return 5; // Default to 5% if no liquidity data
    
    // The impact increases as the transaction size gets closer to the available liquidity
    // Higher liquidity = lower impact
    const impactPercentage = (tradeAmount / liquidity) * 100;
    
    // Cap impact at 10% for safety
    return Math.min(impactPercentage, 10);
  }
}
