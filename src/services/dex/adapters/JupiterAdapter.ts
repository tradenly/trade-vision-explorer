
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { jupiterRateLimiter } from '../utils/rateLimiter';

export class JupiterAdapter extends BaseAdapter {
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      // Use enhanced rate limiter with backoff strategy
      await jupiterRateLimiter.waitForSlot();

      // Verify we're on Solana chain
      if (baseToken.chainId !== 101) {
        throw new Error('Jupiter only supports Solana tokens');
      }

      console.log(`[JupiterAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // Convert amount to smallest unit based on decimals
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, baseToken.decimals || 9));

      // First try the Jupiter price API for quick price check
      try {
        const priceUrl = `https://price.jup.ag/v4/price?ids=${baseToken.address},${quoteToken.address}`;
        const priceResponse = await fetch(priceUrl);
        
        if (!priceResponse.ok) {
          throw new Error(`Jupiter Price API error: ${priceResponse.status}`);
        }

        const priceData = await priceResponse.json();
        
        if (!priceData.data?.[baseToken.address] || !priceData.data?.[quoteToken.address]) {
          throw new Error('Price data not found');
        }
        
        // Calculate price from price data
        const basePrice = priceData.data[baseToken.address].price;
        const quotePrice = priceData.data[quoteToken.address].price;
        const price = basePrice / quotePrice;
        
        // Now get more detailed info using the quote API
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amountInSmallestUnit}&slippageBps=50`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (!quoteResponse.ok) {
          throw new Error(`Jupiter Quote API error: ${quoteResponse.status}`);
        }
        
        const quoteData = await quoteResponse.json();
        
        // Extract additional details from quote data
        const inAmount = parseInt(quoteData.inAmount) / Math.pow(10, baseToken.decimals || 9);
        const outAmount = parseInt(quoteData.outAmount) / Math.pow(10, quoteToken.decimals || 9);
        const calculatedPrice = outAmount / inAmount;
        
        // Use the more accurate quote price if available
        const finalPrice = isNaN(calculatedPrice) ? price : calculatedPrice;
        
        // Calculate Solana gas (transaction fee)
        const signaturesRequired = quoteData.routePlan ? quoteData.routePlan.length + 1 : 2;
        const baseFeeInLamports = 5000 * signaturesRequired;
        const priorityFeeInLamports = 10000; // 10k lamports (0.00001 SOL) priority fee
        const totalFeeInSOL = (baseFeeInLamports + priorityFeeInLamports) / 1e9;
        const solUsdPrice = priceData.data['So11111111111111111111111111111111111111112']?.price || 150; // SOL price in USD
        const gasEstimateUSD = totalFeeInSOL * solUsdPrice;
        
        // Extract liquidity from quote data or use the marketInfos
        const liquidityUSD = quoteData.otherAmountThreshold ? 
          parseFloat(quoteData.otherAmountThreshold) / Math.pow(10, quoteToken.decimals || 9) * calculatedPrice :
          quoteData.marketInfos?.[0]?.liquidityUSD || 1000000;

        jupiterRateLimiter.recordSuccess();
        
        return {
          dexName: this.getName(),
          price: finalPrice,
          fees: this.getTradingFeePercentage(),
          gasEstimate: gasEstimateUSD,
          liquidityUSD: liquidityUSD,
          liquidityInfo: {
            routeInfo: quoteData.routePlan || [],
            marketInfos: quoteData.marketInfos || [],
            inAmount: quoteData.inAmount,
            outAmount: quoteData.outAmount
          },
          timestamp: Date.now()
        };
      } catch (error) {
        console.error('[JupiterAdapter] Error with price API:', error);
        throw error; // Rethrow to use fallback
      }
    } catch (error) {
      console.error(`[JupiterAdapter] Error:`, error);
      jupiterRateLimiter.recordFailure();
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      console.log('[JupiterAdapter] Using fallback price source');
      const { data } = await fetch(
        `https://fkagpyfzgczcaxsqwsoi.supabase.co/rest/v1/dex_price_history?dex_name=eq.jupiter&token_pair=eq.${baseToken.symbol}/${quoteToken.symbol}&order=timestamp.desc&limit=1`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrYWdweWZ6Z2N6Y2F4c3F3c29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDcxODAsImV4cCI6MjA1ODQ4MzE4MH0.hd1Os5VQkyGYLpY1bRBZ3ypy2wxdByFIzoUpk8qBRts'
          }
        }
      ).then(res => res.json());

      if (data && data.length > 0 && data[0].price) {
        return {
          dexName: this.getName(),
          price: data[0].price * (0.995 + Math.random() * 0.01),
          fees: this.getTradingFeePercentage(),
          gasEstimate: 0.00025,
          liquidityUSD: data[0].liquidity || 100000,
          isFallback: true,
          timestamp: Date.now()
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
        isFallback: true,
        timestamp: Date.now()
      };
    }
  }
}
