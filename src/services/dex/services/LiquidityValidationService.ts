import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { supabase } from '@/lib/supabaseClient';
import { PriceImpactService } from './PriceImpactService';

export interface LiquidityInfo {
  availableLiquidity: number;
  priceImpact: number;
  isLiquidityValid: boolean;
  maxTradeSize: number;
}

export class LiquidityValidationService {
  private static instance: LiquidityValidationService;
  private priceImpactService: PriceImpactService;
  private liquidityCache: Map<string, {liquidity: number, timestamp: number}>;
  private readonly CACHE_DURATION = 60000; // 1 minute in ms

  private constructor() {
    this.priceImpactService = PriceImpactService.getInstance();
    this.liquidityCache = new Map();
  }

  public static getInstance(): LiquidityValidationService {
    if (!LiquidityValidationService.instance) {
      LiquidityValidationService.instance = new LiquidityValidationService();
    }
    return LiquidityValidationService.instance;
  }

  /**
   * Get cached liquidity data or fetch from database
   */
  private async getLiquidity(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    dexName: string
  ): Promise<number> {
    const cacheKey = `${baseToken.symbol}/${quoteToken.symbol}_${dexName.toLowerCase()}`;
    const cachedData = this.liquidityCache.get(cacheKey);
    
    // Return cached data if it's fresh
    if (cachedData && (Date.now() - cachedData.timestamp) < this.CACHE_DURATION) {
      return cachedData.liquidity;
    }
    
    try {
      // Get latest liquidity data from the database
      const { data: liquidityData } = await supabase
        .from('dex_price_history')
        .select('liquidity')
        .eq('dex_name', dexName.toLowerCase())
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      const liquidity = liquidityData?.liquidity || this.estimateLiquidity(baseToken, dexName);
      
      // Update cache
      this.liquidityCache.set(cacheKey, {
        liquidity,
        timestamp: Date.now()
      });
      
      return liquidity;
    } catch (error) {
      console.error('Error getting liquidity:', error);
      return this.estimateLiquidity(baseToken, dexName);
    }
  }

  /**
   * Validate liquidity and calculate price impact for a trade
   */
  public async validateLiquidity(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    tradeAmount: number,
    dexName: string
  ): Promise<LiquidityInfo> {
    try {
      const availableLiquidity = await this.getLiquidity(baseToken, quoteToken, dexName);
      
      // Calculate price impact based on trade size and available liquidity
      const priceImpact = this.priceImpactService.calculatePriceImpact(tradeAmount, availableLiquidity);
      
      // Calculate max trade size (10% of liquidity or less to keep impact reasonable)
      const maxTradeSize = this.priceImpactService.calculateMaxTradeSize(availableLiquidity);

      return {
        availableLiquidity,
        priceImpact,
        isLiquidityValid: priceImpact <= 3, // Consider valid if impact is 3% or less
        maxTradeSize
      };
    } catch (error) {
      console.error('Error validating liquidity:', error);
      return {
        availableLiquidity: 0,
        priceImpact: 100,
        isLiquidityValid: false,
        maxTradeSize: 0
      };
    }
  }
  
  /**
   * Validate liquidity for a complete arbitrage route (multiple DEXes)
   */
  public async validateArbitrageRoute(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    buyDex: string,
    sellDex: string,
    tradeAmount: number
  ): Promise<{
    isValid: boolean;
    buyLiquidity: LiquidityInfo;
    sellLiquidity: LiquidityInfo;
  }> {
    const [buyLiquidity, sellLiquidity] = await Promise.all([
      this.validateLiquidity(baseToken, quoteToken, tradeAmount, buyDex),
      this.validateLiquidity(baseToken, quoteToken, tradeAmount, sellDex)
    ]);
    
    return {
      isValid: buyLiquidity.isLiquidityValid && sellLiquidity.isLiquidityValid,
      buyLiquidity,
      sellLiquidity
    };
  }

  /**
   * Estimate liquidity based on token and DEX
   */
  private estimateLiquidity(token: TokenInfo, dexName: string): number {
    // Base liquidity estimation on token market cap or popularity
    // These are rough estimates when real liquidity data is unavailable
    const baseEstimates: Record<string, number> = {
      'ETH': 10000000,
      'WETH': 10000000,
      'BTC': 15000000,
      'WBTC': 15000000,
      'SOL': 5000000,
      'BNB': 3000000,
      'MATIC': 2000000,
      'AVAX': 1500000,
      'LINK': 1000000,
      'UNI': 800000,
      'AAVE': 700000,
      'USDC': 20000000,
      'USDT': 20000000,
      'DAI': 8000000
    };
    
    const symbol = token.symbol.toUpperCase();
    const baseLiquidity = baseEstimates[symbol] || 500000; // Default $500k
    
    // Apply DEX-specific modifier
    const dexLiquidityModifiers: Record<string, number> = {
      'uniswap': 1.0,
      'sushiswap': 0.7,
      'pancakeswap': 0.9,
      'curve': 1.2,
      'balancer': 0.8,
      'jupiter': 1.0,
      'orca': 0.8,
      'raydium': 0.75
    };
    
    const dexModifier = dexLiquidityModifiers[dexName.toLowerCase()] || 0.5;
    
    return baseLiquidity * dexModifier;
  }
}
