
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export class PancakeSwapAdapter extends BaseAdapter {
  private readonly SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc';
  
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      // Only works on BSC
      if (baseToken.chainId !== 56) {
        throw new Error('PancakeSwap adapter only supports BSC');
      }

      const query = `{
        pools(where: {
          token0_in: ["${baseToken.address.toLowerCase()}", "${quoteToken.address.toLowerCase()}"],
          token1_in: ["${baseToken.address.toLowerCase()}", "${quoteToken.address.toLowerCase()}"]
        }, orderBy: totalValueLockedUSD, orderDirection: desc, first: 1) {
          token0Price
          token1Price
          totalValueLockedUSD
          feeTier
        }
      }`;

      const response = await fetch(this.SUBGRAPH_URL, {
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
        throw new Error('No liquidity pool found');
      }

      return {
        dexName: this.getName(),
        price: parseFloat(pool.token0Price),
        fees: 0.0025, // PancakeSwap fee 0.25%
        gasEstimate: 0.0005, // BSC gas is cheap
        liquidityUSD: parseFloat(pool.totalValueLockedUSD),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error in ${this.getName()} quote:`, error);
      throw error;
    }
  }
}
