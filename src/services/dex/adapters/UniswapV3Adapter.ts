
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export class UniswapV3Adapter extends BaseAdapter {
  private static SUBGRAPH_URLS: Record<number, string> = {
    1: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    42161: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
    10: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    8453: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest'
  };

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      const subgraphUrl = UniswapV3Adapter.SUBGRAPH_URLS[baseToken.chainId];
      if (!subgraphUrl) {
        throw new Error(`Chain ${baseToken.chainId} not supported`);
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

      const response = await fetch(subgraphUrl, {
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

      // Get the price based on token order
      const price = parseFloat(pool.token0Price);
      
      return {
        dexName: this.getName(),
        price: price,
        fees: 0.003, // Uniswap fee 0.3%
        gasEstimate: this.getGasEstimate(baseToken.chainId),
        liquidityUSD: parseFloat(pool.totalValueLockedUSD),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error in ${this.getName()} quote:`, error);
      throw error;
    }
  }

  private getGasEstimate(chainId: number): number {
    const estimates: Record<number, number> = {
      1: 0.006,    // Ethereum mainnet
      42161: 0.001, // Arbitrum
      10: 0.0005,   // Optimism
      8453: 0.0008  // Base
    };
    return estimates[chainId] || 0.006;
  }
}
