
import { PriceResult } from '../types.ts';

export abstract class BaseAdapter {
  protected MAX_RETRIES = 3;
  protected RETRY_DELAY = 1000;
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  abstract getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null>;

  protected async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.MAX_RETRIES; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Accept': 'application/json',
            ...options.headers,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed for ${url}:`, error);
        lastError = error as Error;
        
        if (i < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch after retries');
  }

  protected estimateLiquidity(tokenSymbol: string, dexName: string): number {
    // Base liquidity estimation for different tokens
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
    
    const baseLiquidity = baseEstimates[tokenSymbol] || 500000;
    
    // DEX-specific modifier
    const dexMultipliers: Record<string, number> = {
      'uniswap': 1.0,
      'sushiswap': 0.7,
      'pancakeswap': 0.9,
      'curve': 1.2,
      'balancer': 0.8,
      'jupiter': 1.0,
      'orca': 0.8,
      'raydium': 0.75
    };
    
    const dexModifier = dexMultipliers[dexName.toLowerCase()] || 0.5;
    
    return baseLiquidity * dexModifier;
  }

  protected getTradingFee(dexName: string): number {
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
  
  protected handleError(error: unknown, dexName: string): null {
    console.error(`Error in ${dexName} adapter:`, error);
    return null;
  }
}
