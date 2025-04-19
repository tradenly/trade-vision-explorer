
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';
import { rateLimiter } from '../utils/rate-limiter.ts';

export class JupiterAdapter extends BaseAdapter {
  private readonly PRICE_API_URL = 'https://price.jup.ag/v4/price';
  private readonly QUOTE_API_URL = 'https://quote-api.jup.ag/v6/quote';
  private rateLimitDelay = 500; // 500ms between requests

  constructor() {
    super('jupiter');
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null> {
    try {
      // Jupiter only works with Solana
      if (chainId !== 101) {
        return null;
      }

      await rateLimiter.waitForSlot();
      
      // Try the price API first (more efficient)
      let price: number | null = null;
      let liquidity: number = 0;
      
      try {
        // Jupiter price API requires Solana token mints
        const url = `${this.PRICE_API_URL}?ids=${baseTokenAddress}&vsToken=${quoteTokenAddress}`;
        
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        if (data.data?.[baseTokenAddress]?.price) {
          price = data.data[baseTokenAddress].price;
          liquidity = data.data[baseTokenAddress].marketCap || 0;
        }
      } catch (priceError) {
        console.warn('Jupiter price API failed, falling back to quote API:', priceError);
      }
      
      // If price API fails, fall back to quote API
      if (price === null) {
        try {
          // Convert base token to lamports (SOL = 9 decimals)
          const amountInLamports = Math.pow(10, 9); // 1 SOL in lamports
          
          const quoteUrl = `${this.QUOTE_API_URL}?inputMint=${baseTokenAddress}&outputMint=${quoteTokenAddress}&amount=${amountInLamports}`;
          
          const quoteResponse = await this.fetchWithRetry(quoteUrl);
          const quoteData = await quoteResponse.json();
          
          if (quoteData.outAmount && quoteData.inAmount) {
            const inAmount = quoteData.inAmount / Math.pow(10, 9); // SOL decimals
            const outAmount = quoteData.outAmount / Math.pow(10, 6); // USDC decimals
            price = outAmount / inAmount;
            liquidity = quoteData.otherAmountThreshold || 5000000;
          }
        } catch (quoteError) {
          console.error('Jupiter quote API also failed:', quoteError);
          return null;
        }
      }
      
      if (price === null) {
        throw new Error('No price data returned from Jupiter');
      }

      return {
        source: this.getName(),
        price: price,
        timestamp: Date.now(),
        liquidity: liquidity || this.estimateLiquidity('SOL', this.getName()),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error in Jupiter adapter:`, error);
      return null;
    }
  }
}
