
import { TokenInfo } from '@/services/tokenListService';

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
   * Calculate price impact based on trade amount and liquidity
   * @param tradeAmount Amount being traded in USD
   * @param liquidity Available liquidity in USD
   * @param maxImpact Maximum impact to consider (e.g. 5%)
   * @returns Price impact as a percentage
   */
  public calculatePriceImpact(
    tradeAmount: number,
    liquidity: number,
    maxImpact: number = 5
  ): number {
    const impact = (tradeAmount / liquidity) * 100;
    return Math.min(impact, maxImpact);
  }

  /**
   * Calculate effective buy price after price impact
   * @param basePrice Original market price
   * @param priceImpact Price impact percentage
   * @returns Effective price after impact
   */
  public getEffectiveBuyPrice(basePrice: number, priceImpact: number): number {
    return basePrice * (1 + priceImpact / 100);
  }

  /**
   * Calculate effective sell price after price impact
   * @param basePrice Original market price
   * @param priceImpact Price impact percentage
   * @returns Effective price after impact
   */
  public getEffectiveSellPrice(basePrice: number, priceImpact: number): number {
    return basePrice * (1 - priceImpact / 100);
  }
}
