
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Curve DEX
 */
export class CurveAdapter extends BaseAdapter {
  constructor() {
    super('Curve');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Curve works on these chains
      const supportedChains = [1, 137, 42161, 10, 8453]; // Major EVM chains
      if (!supportedChains.includes(chainId)) {
        return null;
      }
      
      // For Curve, we'll use the 1inch API with protocol filtering
      const amountInWei = "1000000000000000000"; // 1 token in wei
      
      const url = `https://api.1inch.io/v5.0/${chainId}/quote?` +
        `fromTokenAddress=${baseTokenAddress}&` +
        `toTokenAddress=${quoteTokenAddress}&` +
        `amount=${amountInWei}&protocols=CURVE`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Calculate price from the response
      const fromAmount = parseInt(data.fromTokenAmount) / 10 ** 18; // Assuming 18 decimals
      const toAmount = parseInt(data.toTokenAmount) / 10 ** 18;     // Assuming 18 decimals  
      const price = toAmount / fromAmount;
      
      return {
        source: this.getName().toLowerCase(),
        price,
        liquidity: data.protocols?.[0]?.[0]?.liquidity || this.estimateLiquidity('ETH', this.getName()),
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
