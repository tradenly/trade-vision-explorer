
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { jupiterRateLimiter } from '../utils/rateLimiter';

export class JupiterAdapter extends BaseAdapter {
  private static REQUEST_COUNTER = 0;
  private static LAST_REQUEST_TIME = 0;
  private static readonly RATE_LIMIT = 50; // requests per minute
  private static readonly RATE_WINDOW = 60000; // 1 minute in milliseconds

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      await jupiterRateLimiter.waitForSlot();

      if (baseToken.chainId === 101) {
        return await this.fetchSolanaQuote(baseToken, quoteToken, amount);
      }
      
      throw new Error("Jupiter only supports Solana tokens");
    } catch (error) {
      console.error(`[JupiterAdapter] Error:`, error);
      return await this.getFallbackQuote(baseToken, quoteToken, amount);
    }
  }

  private async fetchSolanaQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number): Promise<PriceQuote> {
    console.log(`[JupiterAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol} on Solana`);
    
    const { inputMint, outputMint, amountInSmallestUnit } = this.prepareQuoteParams(baseToken, quoteToken, amount);
    const data = await this.fetchJupiterQuote(inputMint, outputMint, amountInSmallestUnit);
    return this.processQuoteResponse(data, baseToken, quoteToken);
  }

  private prepareQuoteParams(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number) {
    return {
      inputMint: baseToken.address,
      outputMint: quoteToken.address,
      amountInSmallestUnit: Math.floor(amount * Math.pow(10, baseToken.decimals || 9))
    };
  }

  private async fetchJupiterQuote(inputMint: string, outputMint: string, amount: number) {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Jupiter API error: ${response.status} ${await response.text()}`);
    }
    
    return await response.json();
  }

  private processQuoteResponse(data: any, baseToken: TokenInfo, quoteToken: TokenInfo): PriceQuote {
    const { inAmount, outAmount } = this.calculateAmounts(data, baseToken, quoteToken);
    const price = outAmount / inAmount;
    const liquidityUSD = data.marketInfos?.[0]?.liquidityUSD || 100000;

    return {
      source: this.getName(),
      price: price,
      fees: this.getTradingFeePercentage(),
      gasEstimate: 0.00025,
      liquidityUSD: liquidityUSD,
      liquidityInfo: {
        routeInfo: data.routePlan || [],
        outAmount: outAmount,
        marketInfos: data.marketInfos || []
      }
    };
  }

  private calculateAmounts(data: any, baseToken: TokenInfo, quoteToken: TokenInfo) {
    return {
      inAmount: Number(data.inAmount) / Math.pow(10, baseToken.decimals || 9),
      outAmount: Number(data.outAmount) / Math.pow(10, quoteToken.decimals || 9)
    };
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
          source: this.getName(),
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
        source: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.00025,
        liquidityUSD: 100000,
        isFallback: true
      };
    }
  }
}
