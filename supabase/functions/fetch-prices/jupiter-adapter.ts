
import { DexAdapter, PriceResult } from './types.ts';

export class JupiterAdapter implements DexAdapter {
  getName(): string {
    return 'jupiter';
  }

  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    if (chainId !== 101) {
      return null; // Jupiter only works with Solana
    }
    
    try {
      // Jupiter public price API doesn't need an API key
      const url = `https://price.jup.ag/v4/price?ids=${baseTokenAddress}&vsToken=${quoteTokenAddress}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.data || !data.data[baseTokenAddress]) {
        return null;
      }
      
      const price = data.data[baseTokenAddress].price;
      // Jupiter price API doesn't provide liquidity data directly
      // Using a reasonable estimate based on the token
      const liquidity = this.estimateLiquidity(baseTokenAddress);
      
      return {
        source: this.getName(),
        price,
        timestamp: Date.now(),
        liquidity,
        tradingFee: 0.0035, // 0.35% is Jupiter's typical fee
      };
    } catch (error) {
      console.error('Jupiter adapter error:', error);
      return null;
    }
  }
  
  // Estimate liquidity since Jupiter doesn't provide liquidity data directly
  private estimateLiquidity(tokenAddress: string): number {
    // Common Solana tokens have higher liquidity
    const highLiquidityTokens = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
    ];
    
    if (highLiquidityTokens.includes(tokenAddress)) {
      return 5000000; // $5 million
    }
    
    // Medium liquidity for well-known tokens
    const mediumLiquidityTokens = [
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
      '9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i'  // ETH (wrapped)
    ];
    
    if (mediumLiquidityTokens.includes(tokenAddress)) {
      return 1000000; // $1 million
    }
    
    return 100000; // $100k for other tokens
  }
}
