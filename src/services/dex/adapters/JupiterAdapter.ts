import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { jupiterRateLimiter } from '../utils/rateLimiter';

export class JupiterAdapter extends BaseAdapter {
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      await jupiterRateLimiter.waitForSlot();

      // Verify we're on Solana chain
      if (baseToken.chainId !== 101) {
        throw new Error('Jupiter only supports Solana tokens');
      }

      console.log(`[JupiterAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // Convert amount to smallest unit based on decimals
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, baseToken.decimals || 9));

      // Real Jupiter Price API integration
      const url = `https://price.jup.ag/v4/price?ids=${baseToken.address},${quoteToken.address}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.data?.[baseToken.address] || !data.data?.[quoteToken.address]) {
        throw new Error('Price data not found');
      }

      // Calculate price and extract market info
      const basePrice = data.data[baseToken.address].price;
      const quotePrice = data.data[quoteToken.address].price;
      const price = basePrice / quotePrice;

      // Get liquidity data from Jupiter's route API for more accuracy
      const routeUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amountInSmallestUnit}&slippageBps=50`;
      const routeData = await fetch(routeUrl).then(res => res.json());

      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.00001, // Solana gas is very low
        liquidityUSD: routeData.marketInfos?.[0]?.liquidityUSD || 100000,
        liquidityInfo: {
          routeInfo: routeData.routePlan || [],
          marketInfos: routeData.marketInfos || []
        }
      };

    } catch (error) {
      console.error(`[JupiterAdapter] Error:`, error);
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
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
