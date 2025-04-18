
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { supabase } from '@/lib/supabaseClient';

export interface LiquidityInfo {
  availableLiquidity: number;
  priceImpact: number;
  isLiquidityValid: boolean;
  maxTradeSize: number;
}

export class LiquidityValidationService {
  private static instance: LiquidityValidationService;

  private constructor() {}

  public static getInstance(): LiquidityValidationService {
    if (!LiquidityValidationService.instance) {
      LiquidityValidationService.instance = new LiquidityValidationService();
    }
    return LiquidityValidationService.instance;
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
      // Get latest liquidity data from the database
      const { data: liquidityData } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('dex_name', dexName.toLowerCase())
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!liquidityData) {
        return {
          availableLiquidity: 0,
          priceImpact: 100,
          isLiquidityValid: false,
          maxTradeSize: 0
        };
      }

      // Calculate price impact based on trade size and available liquidity
      const availableLiquidity = liquidityData.liquidity || 100000; // Default to 100k if not available
      const priceImpact = this.calculatePriceImpact(tradeAmount, availableLiquidity);
      const maxTradeSize = availableLiquidity * 0.1; // Max 10% of liquidity pool

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
   * Calculate price impact percentage
   */
  private calculatePriceImpact(tradeAmount: number, liquidity: number): number {
    // Basic price impact calculation (can be refined based on AMM curve)
    const impact = (tradeAmount / liquidity) * 100;
    return Math.min(impact, 100); // Cap at 100%
  }
}
