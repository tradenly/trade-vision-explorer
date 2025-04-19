
import { BaseAdapter } from './base-adapter';
import { PriceResult } from '../types';

export class JupiterAdapter extends BaseAdapter {
  private readonly BASE_URL = 'https://price.jup.ag/v4/price';
  private rateLimitDelay = 500; // 500ms between requests

  getName(): string {
    return 'jupiter';
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, _chainId: number): Promise<PriceResult | null> {
    try {
      // Jupiter requires Solana token mints
      const url = `${this.BASE_URL}?ids=${baseTokenAddress}&vsToken=${quoteTokenAddress}`;
      
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      if (!data.data?.[baseTokenAddress]?.price) {
        throw new Error('No price data returned');
      }

      return {
        source: this.getName(),
        price: data.data[baseTokenAddress].price,
        timestamp: Date.now(),
        liquidity: data.data[baseTokenAddress].marketCap || 100000
      };
    } catch (error) {
      return this.handleError(error, this.getName());
    } finally {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }
  }
}
