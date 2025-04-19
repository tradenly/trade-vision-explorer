
import { PriceResult } from '../types.ts';

export abstract class BaseAdapter {
  private name: string;
  private maxRetries = 3;
  
  constructor(name: string) {
    this.name = name;
  }
  
  public getName(): string {
    return this.name;
  }
  
  abstract getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null>;
  
  protected async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let attempt = 1;
    
    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url, options);
        
        if (response.ok) {
          return response;
        }
        
        if (response.status === 429) { // Rate limit
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : attempt * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (response.status >= 500) {
          // Server error, retry
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        } else {
          // Client error, don't retry
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
      
      console.error(`Attempt ${attempt} failed for ${url}: ${error}`);
      attempt++;
    }
    
    throw new Error(`Failed after ${this.maxRetries} attempts`);
  }
  
  protected getTradingFee(dexName: string): number {
    const fees: Record<string, number> = {
      '1inch': 0.003, // 0.3%
      'uniswap': 0.003, // 0.3%
      'jupiter': 0.0035, // 0.35%
      'orca': 0.003, // 0.3%
      'raydium': 0.003, // 0.3%
      'sushiswap': 0.003, // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'curve': 0.0004 // 0.04%
    };
    
    return fees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
  }
  
  protected estimateLiquidity(tokenSymbol: string, dexName: string): number {
    const baseEstimates: Record<string, number> = {
      'ETH': 10000000,
      'SOL': 5000000,
      'BNB': 3000000,
      'MATIC': 1000000,
      'USDC': 20000000,
      'USDT': 20000000,
      'DAI': 8000000
    };
    
    const dexMultipliers: Record<string, number> = {
      '1inch': 1.0,
      'uniswap': 1.0,
      'jupiter': 1.0,
      'orca': 0.8,
      'raydium': 0.7,
      'sushiswap': 0.7,
      'pancakeswap': 0.9,
      'curve': 1.2
    };
    
    const baseLiquidity = baseEstimates[tokenSymbol] || 500000; // Default value
    const multiplier = dexMultipliers[dexName.toLowerCase()] || 1.0;
    
    return baseLiquidity * multiplier;
  }
  
  protected handleError(error: unknown, sourceName: string): PriceResult | null {
    console.error(`Error in ${sourceName} adapter:`, error);
    return null;
  }
}
