
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Jupiter (Solana DEX aggregator)
 */
export class JupiterAdapter extends BaseAdapter {
  private readonly PRICE_API_URL = 'https://price.jup.ag/v4/price';
  
  constructor() {
    super('Jupiter');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Jupiter only works with Solana
      if (chainId !== 101) {
        return null;
      }
      
      // Use Jupiter price API
      const url = `${this.PRICE_API_URL}?ids=${baseTokenAddress},${quoteTokenAddress}`;
      const response = await this.fetchWithRetry(url);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we have price data for both tokens
      if (!data.data?.[baseTokenAddress]?.price || !data.data?.[quoteTokenAddress]?.price) {
        return null;
      }
      
      // Calculate the price ratio
      const basePrice = data.data[baseTokenAddress].price;
      const quotePrice = data.data[quoteTokenAddress].price;
      const price = basePrice / quotePrice;
      
      // Get liquidity data if available
      const liquidity = data.data[baseTokenAddress].marketCap || 
                       this.estimateLiquidity('SOL', this.getName());
      
      return {
        source: this.getName().toLowerCase(),
        price,
        liquidity,
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
