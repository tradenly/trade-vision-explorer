
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';
import { rateLimiter } from '../utils/rate-limiter.ts';

export class JupiterAdapter extends BaseAdapter {
  private readonly BASE_URL = 'https://price.jup.ag/v4/price';
  private rateLimitDelay = 500; // 500ms between requests

  constructor() {
    super('jupiter');
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null> {
    try {
      // Jupiter only works with Solana
      if (chainId !== 101) {
        return null;
      }

      await rateLimiter.waitForSlot();
      
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
        liquidity: data.data[baseTokenAddress].marketCap || this.estimateLiquidity('SOL', this.getName()),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      return this.handleError(error, this.getName());
    }
  }
}
