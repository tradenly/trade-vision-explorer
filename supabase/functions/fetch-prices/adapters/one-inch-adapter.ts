
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

export class OneInchAdapter extends BaseAdapter {
  private readonly API_KEY = Deno.env.get('ONEINCH_API_KEY');
  private readonly BASE_URL = 'https://api.1inch.dev/price/v1.1';
  private rateLimitDelay = 1000; // 1 second between requests

  getName(): string {
    return '1inch';
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null> {
    try {
      const url = `${this.BASE_URL}/${chainId}/quote?src=${baseTokenAddress}&dst=${quoteTokenAddress}&amount=1000000000000000000`;
      
      const response = await this.fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`
        }
      });
      
      const data = await response.json();
      
      if (!data.price) {
        throw new Error('No price data returned');
      }

      return {
        source: this.getName(),
        price: parseFloat(data.price),
        timestamp: Date.now(),
        liquidity: data.estimatedGas || 100000
      };
    } catch (error) {
      return this.handleError(error, this.getName());
    } finally {
      // Ensure rate limit compliance
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }
  }
}
