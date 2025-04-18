
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Sushiswap DEX
 */
export class SushiswapAdapter extends BaseAdapter {
  constructor() {
    super('Sushiswap');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Note: These IDs are based on chain ID mapping
      const chainMap: Record<number, { id: string, name: string }> = {
        1: { id: '1', name: 'ethereum' },
        137: { id: '137', name: 'polygon' },
        42161: { id: '42161', name: 'arbitrum' },
        8453: { id: '8453', name: 'base' },
      };
      
      // Skip if chain not supported by this adapter
      if (!chainMap[chainId]) {
        return null;
      }
      
      // Use 1inch API to get price data for Sushiswap
      const url = `https://api.1inch.io/v5.0/${chainId}/quote?` + 
        `fromTokenAddress=${baseTokenAddress}&` +
        `toTokenAddress=${quoteTokenAddress}&` + 
        `amount=1000000000000000000&protocols=SUSHISWAP`; // 1 token in wei
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Calculate price from response data
      const fromAmount = parseInt(data.fromTokenAmount) / 10 ** 18; // Assuming 18 decimals
      const toAmount = parseInt(data.toTokenAmount) / 10 ** 18;     // Assuming 18 decimals
      const price = toAmount / fromAmount;
      
      // Extract liquidity data if available
      const liquidity = data.protocols?.[0]?.[0]?.liquidity || 
                       this.estimateLiquidity('ETH', this.getName());
      
      return {
        source: this.getName().toLowerCase(),
        price: price,
        liquidity: liquidity,
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
