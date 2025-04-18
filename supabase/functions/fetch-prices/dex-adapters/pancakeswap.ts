
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for PancakeSwap DEX
 */
export class PancakeSwapAdapter extends BaseAdapter {
  constructor() {
    super('PancakeSwap');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Check if chain is supported by PancakeSwap
      const supportedChains = [56, 1, 8453]; // BSC, Ethereum, Base
      if (!supportedChains.includes(chainId)) {
        return null;
      }
      
      const amountIn = "1000000000000000000"; // 1 token in wei
      const url = `https://api.1inch.io/v5.0/${chainId}/quote?` +
        `fromTokenAddress=${baseTokenAddress}&` +
        `toTokenAddress=${quoteTokenAddress}&` +
        `amount=${amountIn}&protocols=PANCAKESWAP`;
      
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
        liquidity: data.protocols?.[0]?.[0]?.liquidity || this.estimateLiquidity('BNB', this.getName()),
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
