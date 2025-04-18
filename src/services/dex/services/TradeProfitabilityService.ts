
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
}
