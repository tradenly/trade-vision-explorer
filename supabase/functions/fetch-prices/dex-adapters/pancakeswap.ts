
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for PancakeSwap DEX (direct subgraph access)
 */
export class PancakeSwapAdapter extends BaseAdapter {
  private readonly SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc';
  
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

      // Handle ETH address (replace with WETH or WBNB)
      if (baseTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        baseTokenAddress = chainId === 56 
          ? '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' // WBNB on BSC
          : '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH on Ethereum
      }
      if (quoteTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
        quoteTokenAddress = chainId === 56 
          ? '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' // WBNB on BSC
          : '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH on Ethereum
      }
      
      // Normalize addresses to lowercase
      baseTokenAddress = baseTokenAddress.toLowerCase();
      quoteTokenAddress = quoteTokenAddress.toLowerCase();
      
      // Query the PancakeSwap subgraph for pool information
      const query = `{
        pools(where: {
          token0_in: ["${baseTokenAddress}", "${quoteTokenAddress}"],
          token1_in: ["${baseTokenAddress}", "${quoteTokenAddress}"]
        }, orderBy: totalValueLockedUSD, orderDirection: desc, first: 1) {
          token0Price
          token1Price
          totalValueLockedUSD
          feeTier
          token0 { id }
          token1 { id }
        }
      }`;

      const response = await this.fetchWithRetry(this.SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Subgraph error: ${response.status}`);
      }

      const { data } = await response.json();
      const pool = data?.pools?.[0];
      
      if (!pool) {
        return null;
      }

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
        tradingFee: parseInt(pool.feeTier || '2500') / 1000000 // Default to 0.25% if not specified
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
