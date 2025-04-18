
import { DexAdapter, PriceResult } from '../types.ts';

export class UniswapAdapter implements DexAdapter {
  private rateLimit = 3; // Max 3 requests per second
  private lastRequest = 0;

  async getPrice(baseToken: string, quoteToken: string, chainId: number): Promise<PriceResult> {
    await this.checkRateLimit();
    
    try {
      // Use Uniswap V3 subgraph for price data
      const response = await fetch(
        'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `{
              pool(id: "${baseToken}-${quoteToken}-3000") {
                token0Price
                token1Price
                liquidity
                volumeUSD
              }
            }`
          })
        }
      );

      const data = await response.json();
      
      return {
        price: parseFloat(data.data.pool.token0Price),
        liquidity: parseFloat(data.data.pool.liquidity),
        volume: parseFloat(data.data.pool.volumeUSD),
        source: 'uniswap',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Uniswap price fetch error:', error);
      return null;
    }
  }

  private async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < (1000 / this.rateLimit)) {
      await new Promise(resolve => 
        setTimeout(resolve, (1000 / this.rateLimit) - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = now;
  }
}
