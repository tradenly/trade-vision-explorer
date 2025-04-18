
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { LiquidityValidationService, LiquidityInfo } from './LiquidityValidationService';

export interface RouteStep {
  dexName: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  expectedRate: number;
  priceImpact: number;
  estimatedGas: number;
}

export interface OptimizedRoute {
  steps: RouteStep[];
  totalGasEstimate: number;
  expectedProfit: number;
  isViable: boolean;
  minRequiredLiquidity: number;
}

export class RouteOptimizationService {
  private static instance: RouteOptimizationService;
  private liquidityService: LiquidityValidationService;

  private constructor() {
    this.liquidityService = LiquidityValidationService.getInstance();
  }

  public static getInstance(): RouteOptimizationService {
    if (!RouteOptimizationService.instance) {
      RouteOptimizationService.instance = new RouteOptimizationService();
    }
    return RouteOptimizationService.instance;
  }

  /**
   * Find and validate the optimal arbitrage route
   */
  public async findOptimalRoute(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    tradeAmount: number,
    quotes: Record<string, PriceQuote>
  ): Promise<OptimizedRoute> {
    try {
      const dexes = Object.keys(quotes);
      let bestRoute: OptimizedRoute = {
        steps: [],
        totalGasEstimate: 0,
        expectedProfit: 0,
        isViable: false,
        minRequiredLiquidity: 0
      };

      // Find the best buy and sell DEX combination
      for (const buyDex of dexes) {
        for (const sellDex of dexes) {
          if (buyDex === sellDex) continue;

          const buyQuote = quotes[buyDex];
          const sellQuote = quotes[sellDex];

          if (!buyQuote || !sellQuote) continue;

          // Validate liquidity on both DEXes
          const [buyLiquidity, sellLiquidity] = await Promise.all([
            this.liquidityService.validateLiquidity(baseToken, quoteToken, tradeAmount, buyDex),
            this.liquidityService.validateLiquidity(baseToken, quoteToken, tradeAmount, sellDex)
          ]);

          if (!buyLiquidity.isLiquidityValid || !sellLiquidity.isLiquidityValid) {
            continue;
          }

          const route = await this.calculateRouteMetrics(
            baseToken,
            quoteToken,
            tradeAmount,
            buyQuote,
            sellQuote,
            buyLiquidity,
            sellLiquidity,
            buyDex,
            sellDex
          );

          if (route.expectedProfit > bestRoute.expectedProfit) {
            bestRoute = route;
          }
        }
      }

      return bestRoute;
    } catch (error) {
      console.error('Error finding optimal route:', error);
      return {
        steps: [],
        totalGasEstimate: 0,
        expectedProfit: 0,
        isViable: false,
        minRequiredLiquidity: 0
      };
    }
  }

  private async calculateRouteMetrics(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    tradeAmount: number,
    buyQuote: PriceQuote,
    sellQuote: PriceQuote,
    buyLiquidity: LiquidityInfo,
    sellLiquidity: LiquidityInfo,
    buyDex: string,
    sellDex: string
  ): Promise<OptimizedRoute> {
    // Calculate buy step
    const buyStep: RouteStep = {
      dexName: buyDex,
      tokenIn: quoteToken,
      tokenOut: baseToken,
      expectedRate: buyQuote.price,
      priceImpact: buyLiquidity.priceImpact,
      estimatedGas: buyQuote.gasEstimate || 0
    };

    // Calculate sell step
    const sellStep: RouteStep = {
      dexName: sellDex,
      tokenIn: baseToken,
      tokenOut: quoteToken,
      expectedRate: sellQuote.price,
      priceImpact: sellLiquidity.priceImpact,
      estimatedGas: sellQuote.gasEstimate || 0
    };

    const totalGasEstimate = buyStep.estimatedGas + sellStep.estimatedGas;
    const expectedProfit = this.calculateExpectedProfit(
      tradeAmount,
      buyQuote,
      sellQuote,
      buyLiquidity.priceImpact,
      sellLiquidity.priceImpact,
      totalGasEstimate
    );

    return {
      steps: [buyStep, sellStep],
      totalGasEstimate,
      expectedProfit,
      isViable: expectedProfit > 0,
      minRequiredLiquidity: Math.min(buyLiquidity.availableLiquidity, sellLiquidity.availableLiquidity)
    };
  }

  private calculateExpectedProfit(
    tradeAmount: number,
    buyQuote: PriceQuote,
    sellQuote: PriceQuote,
    buyImpact: number,
    sellImpact: number,
    gasEstimate: number
  ): number {
    // Apply price impact to quotes
    const effectiveBuyPrice = buyQuote.price * (1 + buyImpact / 100);
    const effectiveSellPrice = sellQuote.price * (1 - sellImpact / 100);

    // Calculate expected profit
    const baseTokenAmount = tradeAmount / effectiveBuyPrice;
    const expectedReturn = baseTokenAmount * effectiveSellPrice;
    const tradingFees = (buyQuote.fees || 0.003) * tradeAmount + (sellQuote.fees || 0.003) * expectedReturn;
    
    return expectedReturn - tradeAmount - tradingFees - gasEstimate;
  }
}
