
import { PriceResult } from '../types';

export abstract class BaseAdapter {
  protected MAX_RETRIES = 3;
  protected RETRY_DELAY = 1000;

  abstract getName(): string;
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
  
  protected handleError(error: unknown, dexName: string): null {
    console.error(`Error in ${dexName} adapter:`, error);
    return null;
  }
}
