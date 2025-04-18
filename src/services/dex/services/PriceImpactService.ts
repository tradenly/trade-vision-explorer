
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

  public calculatePriceImpact(
    tradeAmount: number,
    liquidity: number,
    maxImpact: number = 5
  ): number {
    const impact = (tradeAmount / liquidity) * 100;
    return Math.min(impact, maxImpact);
  }

  public getEffectiveBuyPrice(basePrice: number, priceImpact: number): number {
    return basePrice * (1 + priceImpact / 100);
  }

  public getEffectiveSellPrice(basePrice: number, priceImpact: number): number {
    return basePrice * (1 - priceImpact / 100);
  }
}
