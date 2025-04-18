import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { LiquidityValidationService, LiquidityInfo } from './LiquidityValidationService';
import { PriceImpactService } from './PriceImpactService';
import { TradeProfitabilityService } from './TradeProfitabilityService';

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
  private priceImpactService: PriceImpactService;
  private profitabilityService: TradeProfitabilityService;

  private constructor() {
    this.liquidityService = LiquidityValidationService.getInstance();
    this.priceImpactService = PriceImpactService.getInstance();
    this.profitabilityService = TradeProfitabilityService.getInstance();
  }

  public static getInstance(): RouteOptimizationService {
    if (!RouteOptimizationService.instance) {
      RouteOptimizationService.instance = new RouteOptimizationService();
    }
    return RouteOptimizationService.instance;
  }

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

      for (const buyDex of dexes) {
        for (const sellDex of dexes) {
          if (buyDex === sellDex) continue;

          const buyQuote = quotes[buyDex];
          const sellQuote = quotes[sellDex];

          if (!buyQuote || !sellQuote) continue;

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
    const buyStep: RouteStep = {
      dexName: buyDex,
      tokenIn: quoteToken,
      tokenOut: baseToken,
      expectedRate: buyQuote.price,
      priceImpact: buyLiquidity.priceImpact,
      estimatedGas: buyQuote.gasEstimate || 0
    };

    const sellStep: RouteStep = {
      dexName: sellDex,
      tokenIn: baseToken,
      tokenOut: quoteToken,
      expectedRate: sellQuote.price,
      priceImpact: sellLiquidity.priceImpact,
      estimatedGas: sellQuote.gasEstimate || 0
    };

    const totalGasEstimate = buyStep.estimatedGas + sellStep.estimatedGas;
    const expectedProfit = this.profitabilityService.calculateExpectedProfit(
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
}
