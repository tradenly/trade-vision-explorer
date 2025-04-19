
import { PriceResult } from '../types.ts';

/**
 * Base class for all DEX adapters
 */
export abstract class BaseAdapter {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
  
  /**
   * Get token price from a specific DEX
   */
  abstract getPrice(
    baseTokenAddress: string,
    quoteTokenAddress: string,
    chainId: number
  ): Promise<PriceResult | null>;
  
  /**
   * Helper method for retrying fetch requests
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries = 2,
    delay = 1000
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      if (retries === 0) throw new Error(`HTTP error! status: ${response.status}`);
      
      console.warn(`Request failed, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(url, options, retries - 1, delay * 2);
    } catch (error) {
      if (retries === 0) throw error;
      
      console.warn(`Fetch error, retrying... (${retries} retries left):`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(url, options, retries - 1, delay * 2);
    }
  }
  
  /**
   * Estimate liquidity when not provided by API
   */
  protected estimateLiquidity(tokenSymbol: string, dexName: string): number {
    // Default liquidity estimates by token and DEX
    const tokenEstimates: Record<string, number> = {
      'ETH': 10000000,
      'BTC': 15000000,
      'SOL': 5000000,
      'BNB': 3000000,
      'USDC': 20000000,
      'USDT': 20000000
    };
    
    const dexMultipliers: Record<string, number> = {
      'uniswap': 1,
      'sushiswap': 0.7,
      'pancakeswap': 0.9,
      'jupiter': 1,
      'raydium': 0.8,
      'orca': 0.75
    };
    
    const baseEstimate = tokenEstimates[tokenSymbol] || 1000000;
    const multiplier = dexMultipliers[dexName.toLowerCase()] || 0.5;
    
    return baseEstimate * multiplier;
  }
  
  /**
   * Get trading fee percentage for a DEX
   */
  protected getTradingFee(dexName: string): number {
    const fees: Record<string, number> = {
      'uniswap': 0.003, // 0.3%
      'sushiswap': 0.003, // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'jupiter': 0.0035, // 0.35%
      'raydium': 0.003, // 0.3%
      'orca': 0.003, // 0.3%
      'curve': 0.0004 // 0.04%
    };
    
    return fees[dexName.toLowerCase()] || 0.003;
  }
}
