
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { uniswapRateLimiter } from '../utils/rateLimiter';

export class UniswapAdapter extends BaseAdapter {
  private static SUBGRAPH_URLS: Record<number, string> = {
    1: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    42161: 'https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-minimal',
    10: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    8453: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest'
  };

  constructor(config: DexConfig) {
    super(config);
  }

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      await uniswapRateLimiter.waitForSlot();

      const subgraphUrl = UniswapAdapter.SUBGRAPH_URLS[baseToken.chainId];
      if (!subgraphUrl) {
        throw new Error(`Uniswap not supported on chain ${baseToken.chainId}`);
      }

      const query = `{
        pools(where: {
          token0_in: ["${baseToken.address.toLowerCase()}", "${quoteToken.address.toLowerCase()}"],
          token1_in: ["${baseToken.address.toLowerCase()}", "${quoteToken.address.toLowerCase()}"]
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

      const isBaseToken0 = baseToken.address.toLowerCase() === pool.token0.id;
      const price = isBaseToken0 ? Number(pool.token0Price) : Number(pool.token1Price);

      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: this.calculateGasEstimate(baseToken.chainId),
        liquidityUSD: Number(pool.totalValueLockedUSD),
        liquidityInfo: {
          feeTier: pool.feeTier,
          liquidity: pool.liquidity,
          poolId: pool.id
        },
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`[UniswapAdapter] Error:`, error);
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private calculateGasEstimate(chainId: number): number {
    const estimates: Record<number, number> = {
      1: 0.006,    // Ethereum (~$6 during normal conditions)
      42161: 0.001, // Arbitrum (~$1)
      10: 0.0005,   // Optimism (~$0.50)
      8453: 0.0008  // Base (~$0.80)
    };
    return estimates[chainId] || 0.006;
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      const amountInWei = (1 * Math.pow(10, baseToken.decimals || 18)).toString();
      
      const response = await fetch(
        `https://api.1inch.io/v5.0/${baseToken.chainId}/quote?` +
        `fromTokenAddress=${baseToken.address}&toTokenAddress=${quoteToken.address}&amount=${amountInWei}`,
        {
          headers: { 'Accept': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const data = await response.json();
      const fromAmount = parseInt(data.fromTokenAmount) / Math.pow(10, baseToken.decimals || 18);
      const toAmount = parseInt(data.toTokenAmount) / Math.pow(10, quoteToken.decimals || 18);
      const price = toAmount / fromAmount;

      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.005,
        liquidityUSD: 1000000,
        isFallback: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[UniswapAdapter] Fallback error:', error);
      
      return {
        dexName: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.005,
        liquidityUSD: 1000000,
        isFallback: true,
        timestamp: Date.now()
      };
    }
  }
}
