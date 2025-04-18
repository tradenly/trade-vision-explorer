
import { PriceQuote } from '../types';
import { PriceImpactService } from './PriceImpactService';

export class TradeProfitabilityService {
  private static instance: TradeProfitabilityService;
  private priceImpactService: PriceImpactService;

  private constructor() {
    this.priceImpactService = PriceImpactService.getInstance();
  }

  public static getInstance(): TradeProfitabilityService {
    if (!TradeProfitabilityService.instance) {
      TradeProfitabilityService.instance = new TradeProfitabilityService();
    }
    return TradeProfitabilityService.instance;
  }

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
}
