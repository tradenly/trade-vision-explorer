
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

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      // Apply rate limiting
      await uniswapRateLimiter.waitForSlot();

      // Verify chain is supported
      const subgraphUrl = UniswapAdapter.SUBGRAPH_URLS[baseToken.chainId];
      if (!subgraphUrl) {
        throw new Error(`Uniswap not supported on chain ${baseToken.chainId}`);
      }

      // Query Uniswap V3 subgraph for pool data
      const query = `{
        pool(id: "${this.getPoolAddress(baseToken.address, quoteToken.address)}") {
          token0Price
          token1Price
          liquidity
          feeTier
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

      const data = await response.json();
      if (!data.data?.pool) {
        throw new Error('Pool not found');
      }

      const pool = data.data.pool;
      const price = baseToken.address.toLowerCase() < quoteToken.address.toLowerCase() 
        ? Number(pool.token0Price) 
        : Number(pool.token1Price);

      // Calculate gas based on chain
      const gasEstimateGwei = this.getGasEstimate(baseToken.chainId);
      const gasPriceGwei = this.getGasPrice(baseToken.chainId);
      const nativePriceUSD = this.getNativeTokenPrice(baseToken.chainId);
      const gasEstimateUSD = (gasEstimateGwei * gasPriceGwei * 1e-18) * nativePriceUSD;

      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: gasEstimateUSD,
        liquidityUSD: Number(pool.totalValueLockedUSD),
        liquidityInfo: {
          feeTier: pool.feeTier,
          totalValueLockedUSD: pool.totalValueLockedUSD,
          liquidity: pool.liquidity
        }
      };
    } catch (error) {
      console.error(`[UniswapAdapter] Primary API error:`, error);
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private getPoolAddress(token0: string, token1: string): string {
    // Sort tokens to match Uniswap's pool addressing
    const [tokenA, tokenB] = [token0.toLowerCase(), token1.toLowerCase()].sort();
    // This is a simplified version - in production you'd want to query all fee tiers
    const feeTier = 3000; // 0.3% fee tier
    return `${tokenA}-${tokenB}-${feeTier}`;
  }

  private getGasEstimate(chainId: number): number {
    const estimates: Record<number, number> = {
      1: 180000,    // Ethereum
      42161: 550000, // Arbitrum
      10: 350000,    // Optimism
      8453: 150000   // Base
    };
    return estimates[chainId] || 180000;
  }

  private getGasPrice(chainId: number): number {
    const prices: Record<number, number> = {
      1: 50,     // Ethereum (~50 gwei)
      42161: 0.1, // Arbitrum (~0.1 gwei)
      10: 0.001,  // Optimism (~0.001 gwei)
      8453: 0.1   // Base (~0.1 gwei)
    };
    return prices[chainId] || 50;
  }

  private getNativeTokenPrice(chainId: number): number {
    const prices: Record<number, number> = {
      1: 3500,    // ETH
      42161: 3500, // ETH on Arbitrum
      10: 3500,    // ETH on Optimism
      8453: 3500   // ETH on Base
    };
    return prices[chainId] || 3500;
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      // Try 1inch API as fallback
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
        isFallback: true
      };
    } catch (error) {
      console.error('[UniswapAdapter] Fallback error:', error);
      
      // Final fallback using cached data
      return {
        dexName: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.005,
        liquidityUSD: 1000000,
        isFallback: true
      };
    }
  }
}
