
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { TokenInfo } from '@/services/tokenListService';
import { LiquidityValidationService } from './LiquidityValidationService';
import { PriceImpactService } from './PriceImpactService';

/**
 * Service to validate trade parameters before execution
 */
export class TradeValidationService {
  private static instance: TradeValidationService;
  private liquidityService: LiquidityValidationService;
  private priceImpactService: PriceImpactService;

  private constructor() {
    this.liquidityService = LiquidityValidationService.getInstance();
    this.priceImpactService = PriceImpactService.getInstance();
  }

  public static getInstance(): TradeValidationService {
    if (!TradeValidationService.instance) {
      TradeValidationService.instance = new TradeValidationService();
    }
    return TradeValidationService.instance;
  }

  /**
   * Validate a trade before execution
   */
  public async validateTrade(
    opportunity: ArbitrageOpportunity,
    investmentAmount: number,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<{ 
    isValid: boolean;
    error?: string;
    details?: any;
  }> {
    // Check for sufficient liquidity
    const liquidity = await this.liquidityService.validateArbitrageRoute(
      opportunity.baseToken,
      opportunity.quoteToken,
      opportunity.buyDex,
      opportunity.sellDex,
      investmentAmount
    );

    if (!liquidity.isValid) {
      return {
        isValid: false,
        error: 'Insufficient liquidity for this trade',
        details: {
          insufficientLiquidity: true,
          buyLiquidity: liquidity.buyLiquidity.availableLiquidity,
          sellLiquidity: liquidity.sellLiquidity.availableLiquidity,
          requiredLiquidity: investmentAmount * 3 // 3x coverage for safety
        }
      };
    }

    // Check if price impact is too high
    const buyPriceImpact = liquidity.buyLiquidity.priceImpact;
    const sellPriceImpact = liquidity.sellLiquidity.priceImpact;

    if (buyPriceImpact > 5 || sellPriceImpact > 5) {
      return {
        isValid: false,
        error: 'Price impact too high',
        details: {
          highPriceImpact: true,
          buyPriceImpact,
          sellPriceImpact,
          maxAcceptablePriceImpact: 5
        }
      };
    }

    // Check if the opportunity is still profitable
    const effectiveBuyPrice = this.priceImpactService.getEffectiveBuyPrice(
      opportunity.buyPrice,
      buyPriceImpact
    );
    const effectiveSellPrice = this.priceImpactService.getEffectiveSellPrice(
      opportunity.sellPrice,
      sellPriceImpact
    );

    // If price difference has decreased below slippage tolerance, abort
    const priceDifference = ((effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice) * 100;
    if (priceDifference < slippageTolerance) {
      return {
        isValid: false,
        error: 'Price difference below slippage tolerance',
        details: {
          highSlippage: true,
          priceDifference,
          slippageTolerance
        }
      };
    }

    return { isValid: true };
  }
}
