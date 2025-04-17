
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { rateLimit } from '../utils/rateLimiter';

export class JupiterAdapter extends BaseAdapter {
  private static REQUEST_COUNTER = 0;
  private static LAST_REQUEST_TIME = 0;
  private static readonly RATE_LIMIT = 50; // requests per minute
  private static readonly RATE_WINDOW = 60000; // 1 minute in milliseconds

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      // Enforce rate limiting
      const now = Date.now();
      if (JupiterAdapter.REQUEST_COUNTER >= JupiterAdapter.RATE_LIMIT &&
          now - JupiterAdapter.LAST_REQUEST_TIME < JupiterAdapter.RATE_WINDOW) {
        throw new Error('Rate limit exceeded for Jupiter API');
      }

      // For Solana tokens
      if (baseToken.chainId === 101) {
        console.log(`[JupiterAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol} on Solana`);
        
        // Update rate limiting counters
        JupiterAdapter.REQUEST_COUNTER++;
        JupiterAdapter.LAST_REQUEST_TIME = now;
        
        const inputMint = baseToken.address;
        const outputMint = quoteToken.address;
        const amountInSmallestUnit = Math.floor(amount * Math.pow(10, baseToken.decimals || 9));
        
        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInSmallestUnit}&slippageBps=50`,
          {
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`Jupiter API error: ${response.status} ${await response.text()}`);
        }
        
        const data = await response.json();
        
        // Calculate price
        const inAmountFloat = Number(data.inAmount) / Math.pow(10, baseToken.decimals || 9);
        const outAmountFloat = Number(data.outAmount) / Math.pow(10, quoteToken.decimals || 9);
        const price = outAmountFloat / inAmountFloat;
        
        // Extract liquidity information
        const liquidityUSD = data.marketInfos?.[0]?.liquidityUSD || 100000;
        
        // Reset rate limit counter if window has passed
        if (now - JupiterAdapter.LAST_REQUEST_TIME >= JupiterAdapter.RATE_WINDOW) {
          JupiterAdapter.REQUEST_COUNTER = 0;
        }
        
        return {
          dexName: this.getName(),
          price: price,
          fees: this.getTradingFeePercentage(),
          gasEstimate: 0.00025,
          liquidityUSD: liquidityUSD,
          liquidityInfo: {
            routeInfo: data.routePlan || [],
            outAmount: outAmountFloat,
            marketInfos: data.marketInfos || []
          }
        };
      }
      
      throw new Error("Jupiter only supports Solana tokens");
    } catch (error) {
      console.error(`[JupiterAdapter] Error:`, error);
      return await this.getFallbackQuote(baseToken, quoteToken, amount);
    }
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number): Promise<PriceQuote> {
    try {
      const { data } = await fetch(
        `https://fkagpyfzgczcaxsqwsoi.supabase.co/rest/v1/dex_price_history?dex_name=eq.jupiter&token_pair=eq.${baseToken.symbol}/${quoteToken.symbol}&order=timestamp.desc&limit=1`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrYWdweWZ6Z2N6Y2F4c3F3c29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDcxODAsImV4cCI6MjA1ODQ4MzE4MH0.hd1Os5VQkyGYLpY1bRBZ3ypy2wxdByFIzoUpk8qBRts'
          }
        }
      ).then(res => res.json());

      if (data?.[0]?.price) {
        return {
          dexName: this.getName(),
          price: data[0].price * (0.995 + Math.random() * 0.01),
          fees: this.getTradingFeePercentage(),
          gasEstimate: 0.00025,
          liquidityUSD: 100000,
          isFallback: true
        };
      }
      
      throw new Error('No fallback price available');
    } catch (error) {
      console.error('[JupiterAdapter] Fallback error:', error);
      return {
        dexName: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.00025,
        liquidityUSD: 100000,
        isFallback: true
      };
    }
  }
}
