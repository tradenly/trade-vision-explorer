
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Sushiswap DEX
 */
export class SushiswapAdapter extends BaseAdapter {
  private readonly SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange';
  
  constructor() {
    super('Sushiswap');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // SushiSwap supports these chains
      const supportedChains = [1, 137, 42161, 8453, 10]; // Ethereum, Polygon, Arbitrum, Base, Optimism
      if (!supportedChains.includes(chainId)) {
        return null;
      }

      // Handle ETH address (replace with WETH)
      if (baseTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        baseTokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      }
      if (quoteTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        quoteTokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH
      }
      
      // Create pair ID (SushiSwap uses token addresses concatenated with "-")
      const pairId = [baseTokenAddress, quoteTokenAddress].sort().join('-').toLowerCase();
      
      // Query SushiSwap's subgraph for pair data
      const query = `{
        pair(id: "${pairId}") {
          token0Price
          token1Price
          reserveUSD
          volumeUSD
          token0 { id }
          token1 { id }
        }
      }`;
      
      const response = await this.fetchWithRetry(this.SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      const pair = data.data?.pair;
      
      if (!pair) {
        return null;
      }
      
      // Determine which token is which in the pair
      const isBaseToken0 = pair.token0.id.toLowerCase() === baseTokenAddress.toLowerCase();
      
      // Calculate price depending on token positions
      const price = isBaseToken0 ? parseFloat(pair.token0Price) : parseFloat(pair.token1Price);
      
      return {
        source: this.getName().toLowerCase(),
        price: price,
        liquidity: parseFloat(pair.reserveUSD) || this.estimateLiquidity('ETH', this.getName()),
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
