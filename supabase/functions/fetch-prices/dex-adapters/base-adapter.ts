
import { PriceResult } from '../types.ts';

/**
 * Base DEX adapter with common functionality
 */
export abstract class BaseAdapter {
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
  
  /**
   * Get token price from DEX
   */
  abstract getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null>;
  
  /**
   * Helper to estimate liquidity for DEXes
   */
  protected estimateLiquidity(tokenSymbol: string, dexName: string): number {
    // Base liquidity estimation for different tokens
    // These are rough estimates when real data is unavailable
    const baseEstimates: Record<string, number> = {
      'ETH': 10000000,
      'WETH': 10000000,
      'BTC': 15000000,
      'WBTC': 15000000,
      'SOL': 5000000,
      'BNB': 3000000,
      'USDC': 20000000,
      'USDT': 20000000,
      'DAI': 8000000
    };
    
    // Default to $500k if token not found
    const baseLiquidity = baseEstimates[tokenSymbol] || 500000;
    
    // DEX-specific modifier
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
    
    // Apply DEX-specific modifier
    const dexModifier = dexLiquidityModifiers[dexName.toLowerCase()] || 0.5;
    
    return baseLiquidity * dexModifier;
  }
  
  /**
   * Get trading fee based on DEX
   */
  protected getTradingFee(dexName: string): number {
    // Common trading fees by DEX
    const fees: Record<string, number> = {
      'uniswap': 0.003,     // 0.3%
      'sushiswap': 0.003,   // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'jupiter': 0.0035,    // 0.35%
      'orca': 0.003,        // 0.3%
      'raydium': 0.003,     // 0.3%
      'balancer': 0.002,    // 0.2%
      'curve': 0.0004       // 0.04%
    };
    
    return fees[dexName.toLowerCase()] || 0.003;
  }
}
