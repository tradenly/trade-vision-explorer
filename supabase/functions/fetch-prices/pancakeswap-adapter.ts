
import { DexAdapter, PriceResult } from './types.ts';

export class PancakeSwapAdapter implements DexAdapter {
  getName(): string {
    return 'pancakeswap';
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    if (chainId !== 56) {
      return null; // PancakeSwap only works with BSC
    }
    
    try {
      // Using PancakeSwap's public API
      const url = `https://api.pancakeswap.info/api/v2/tokens/${baseTokenAddress}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PancakeSwap API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data) {
        return null;
      }
      
      const price = parseFloat(data.data.price);
      const liquidity = parseFloat(data.data.liquidity || '1000000');
      
      return {
        source: this.getName(),
        price,
        timestamp: Date.now(),
        liquidity,
        tradingFee: 0.0025, // 0.25% is PancakeSwap's typical fee
      };
    } catch (error) {
      console.error('PancakeSwap adapter error:', error);
      // Fallback to dex-screener if PancakeSwap API fails
      return this.getBackupPrice(baseTokenAddress, quoteTokenAddress);
    }
  }
  
  // Backup method using DEX Screener API
  private async getBackupPrice(baseTokenAddress: string, quoteTokenAddress: string): Promise<PriceResult | null> {
    try {
      const url = `https://api.dexscreener.com/latest/dex/tokens/${baseTokenAddress}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }
      
      // Find pancakeswap pairs
      const pancakePairs = data.pairs.filter((pair: any) => 
        pair.dexId.toLowerCase().includes('pancake')
      );
      
      if (pancakePairs.length === 0) {
        return null;
      }
      
      // Use the pair with highest liquidity
      const bestPair = pancakePairs.sort((a: any, b: any) => 
        parseFloat(b.liquidity.usd) - parseFloat(a.liquidity.usd)
      )[0];
      
      return {
        source: this.getName(),
        price: parseFloat(bestPair.priceUsd),
        timestamp: Date.now(),
        liquidity: parseFloat(bestPair.liquidity.usd),
        tradingFee: 0.0025,
      };
    } catch (error) {
      console.error('Backup price fetch error:', error);
      return null;
    }
  }
}
