
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Uniswap DEX (direct subgraph access)
 */
export class UniswapAdapter extends BaseAdapter {
  private readonly SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
  
  constructor() {
    super('Uniswap');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Uniswap supports these chains
      const supportedChains = [1, 42161, 8453, 10]; // Ethereum, Arbitrum, Base, Optimism
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
      
      // Normalize addresses to lowercase for consistency
      baseTokenAddress = baseTokenAddress.toLowerCase();
      quoteTokenAddress = quoteTokenAddress.toLowerCase();

      // Query the Uniswap V3 Subgraph
      const query = `{
        pools(where: {
          token0_in: ["${baseTokenAddress}", "${quoteTokenAddress}"],
          token1_in: ["${baseTokenAddress}", "${quoteTokenAddress}"]
        }, orderBy: totalValueLockedUSD, orderDirection: desc) {
          id
          token0Price
          token1Price
          feeTier
          liquidity
          token0 { id }
          token1 { id }
          totalValueLockedUSD
        }
      }`;
      
      const response = await this.fetchWithRetry(this.SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await response.json();
      
      if (!data.data?.pools || data.data.pools.length === 0) {
        // Try to get data from memory cache or fallback
        return null;
      }
      
      const pool = data.data.pools[0];
      
      // Determine which token is which in the pool
      const isBaseToken0 = pool.token0.id.toLowerCase() === baseTokenAddress.toLowerCase();
      
      // Get the correct price based on token positions
      const price = isBaseToken0
        ? parseFloat(pool.token0Price)
        : parseFloat(pool.token1Price);
      
      return {
        source: this.getName().toLowerCase(),
        price,
        liquidity: parseFloat(pool.totalValueLockedUSD),
        timestamp: Date.now(),
        tradingFee: parseInt(pool.feeTier) / 1000000 // Convert feeTier to percentage
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
