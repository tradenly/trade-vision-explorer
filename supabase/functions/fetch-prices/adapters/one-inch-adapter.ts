
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';
import { rateLimiter } from '../utils/rate-limiter.ts';

export class OneInchAdapter extends BaseAdapter {
  private readonly API_KEY = Deno.env.get('ONEINCH_API_KEY');
  private readonly BASE_URL = 'https://api.1inch.dev/price/v1.1';
  
  constructor() {
    super('1inch');
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null> {
    try {
      // 1inch only works with EVM chains
      if (chainId === 101) { // 101 is Solana
        return null;
      }

      await rateLimiter.waitForSlot();
      
      const url = `${this.BASE_URL}/${chainId}/quote?src=${baseTokenAddress}&dst=${quoteTokenAddress}&amount=1000000000000000000`;
      
      const response = await this.fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!data.price) {
        throw new Error('No price data returned from 1inch');
      }

      const tokenSymbol = chainId === 56 ? 'BNB' : chainId === 137 ? 'MATIC' : 'ETH';

      return {
        source: this.getName(),
        price: parseFloat(data.price),
        timestamp: Date.now(),
        liquidity: this.estimateLiquidity(tokenSymbol, this.getName()),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      return this.handleError(error, this.getName());
    }
  }
}
