import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import { jupiterRateLimiter } from '../utils/rateLimiter';

export class JupiterAdapter extends BaseAdapter {
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      await jupiterRateLimiter.waitForSlot();
      
      if (baseToken.chainId !== 101) {
        throw new Error('Jupiter only supports Solana tokens');
      }

      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, baseToken.decimals || 9));

      // First try Jupiter price API
      const priceResponse = await fetch(`https://price.jup.ag/v4/price?ids=${baseToken.address},${quoteToken.address}`);
      
      if (!priceResponse.ok) {
        throw new Error(`Jupiter Price API error: ${priceResponse.status}`);
      }

      const priceData = await priceResponse.json();
      
      if (!priceData.data?.[baseToken.address] || !priceData.data?.[quoteToken.address]) {
        throw new Error('Price data not found');
      }
      
      // Calculate relative price
      const basePrice = priceData.data[baseToken.address].price;
      const tokenPrice = priceData.data[quoteToken.address].price;
      const price = basePrice / tokenPrice;

      // Get detailed quote info
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amountInSmallestUnit}&slippageBps=50`
      );
        
      if (!quoteResponse.ok) {
        throw new Error(`Jupiter Quote API error: ${quoteResponse.status}`);
      }
        
      const quoteData = await quoteResponse.json();
      
      // Extract quote details
      const inAmount = parseInt(quoteData.inAmount) / Math.pow(10, baseToken.decimals || 9);
      const outAmount = parseInt(quoteData.outAmount) / Math.pow(10, quoteToken.decimals || 9);
      const finalPrice = outAmount / inAmount;  // Changed from quotePrice to finalPrice

      // Calculate gas estimate
      const signaturesRequired = quoteData.routePlan ? quoteData.routePlan.length + 1 : 2;
      const baseFeeInLamports = 5000 * signaturesRequired;
      const priorityFeeInLamports = 10000;
      const totalFeeInSOL = (baseFeeInLamports + priorityFeeInLamports) / 1e9;
      const solUsdPrice = priceData.data['So11111111111111111111111111111111111111112']?.price || 150;
      const gasEstimateUSD = totalFeeInSOL * solUsdPrice;

      // Extract liquidity info
      const liquidityUSD = quoteData.otherAmountThreshold
        ? parseFloat(quoteData.otherAmountThreshold) / Math.pow(10, quoteToken.decimals || 9) * finalPrice
        : quoteData.marketInfos?.[0]?.liquidityUSD || 1000000;

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
