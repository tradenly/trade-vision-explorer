
import { DexAdapter, PriceResult } from './types.ts';

export class UniswapAdapter implements DexAdapter {
  getName(): string {
    return 'uniswap';
  }

  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    if (chainId !== 1) {
      return null; // Uniswap mainnet only for this adapter
    }
    
    try {
      // Using the public Uniswap subgraph API for price data
      const query = `
      {
        token(id: "${baseTokenAddress.toLowerCase()}") {
          derivedETH
          totalLiquidity
        }
        bundle(id: "1") {
          ethPrice
        }
      }`;
      
      const response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error(`Uniswap API error: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check if we have valid data
      if (!result.data?.token?.derivedETH || !result.data?.bundle?.ethPrice) {
        return null;
      }
      
      const derivedETH = parseFloat(result.data.token.derivedETH);
      const ethPrice = parseFloat(result.data.bundle.ethPrice);
      const price = derivedETH * ethPrice;
      
      // Liquidity in USD
      const totalLiquidity = parseFloat(result.data.token.totalLiquidity) * price;
      
      return {
        source: this.getName(),
        price,
        timestamp: Date.now(),
        liquidity: totalLiquidity || 1000000, // Default to $1M if not available
        tradingFee: 0.003, // 0.3% is Uniswap's typical fee
      };
    } catch (error) {
      console.error('Uniswap adapter error:', error);
      return null;
    }
  }
}
