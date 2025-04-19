
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote, DexConfig } from '../types';
import { TokenInfo } from '../../tokenListService';
import { raydiumRateLimiter } from '../utils/rateLimiter';

export class RaydiumAdapter extends BaseAdapter {
  constructor(config: DexConfig) {
    super(config);
  }
  
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      if (baseToken.chainId !== 101) {
        throw new Error('Raydium is only available on Solana blockchain');
      }

      await raydiumRateLimiter.waitForSlot();

      console.log(`[RaydiumAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol} on Solana`);
      
      const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amount * 1000000}&slippageBps=50&onlyDirectRoutes=true&asLegacyTransaction=true`;
      
      const response = await fetch(jupiterUrl);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Calculate price and extract routing info
      const inAmount = data.inAmount / 1000000; // Jupiter uses 6 decimals
      const outAmount = data.outAmount / 1000000;
      const price = outAmount / inAmount;
      
      // Filter for Raydium routes
      const isRaydiumRoute = data.routePlan && data.routePlan.some(
        (route: any) => route.swapInfo && route.swapInfo.label === 'Raydium'
      );
      
      if (!isRaydiumRoute) {
        throw new Error('No Raydium route found for this pair');
      }
      
      // Solana gas fees calculation (lamports)
      const signaturesRequired = 2; // Typically 2 for a swap
      const baseFeeInLamports = 5000 * signaturesRequired;
      const priorityFeeInLamports = 1000; // Average priority fee
      const totalFeeInLamports = baseFeeInLamports + priorityFeeInLamports;
      const totalFeeInSOL = totalFeeInLamports / 1000000000;
      const solPrice = 150; // Estimated SOL price in USD
      const gasEstimateUSD = totalFeeInSOL * solPrice;
      
      console.log(`[RaydiumAdapter] Fetched price for ${baseToken.symbol}/${quoteToken.symbol}: ${price}, gas: $${gasEstimateUSD}`);
      
      // Extract liquidity info if available
      const liquidityUSD = data.marketInfos?.[0]?.liquidity || 500000;
      
      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: gasEstimateUSD,
        liquidityUSD: liquidityUSD,
        liquidityInfo: {
          routes: data.routePlan || []
        }
      };
    } catch (error) {
      console.error(`[RaydiumAdapter] Error:`, error);
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      const { data } = await fetch(
        `https://fkagpyfzgczcaxsqwsoi.supabase.co/rest/v1/dex_price_history?dex_name=eq.raydium&token_pair=eq.${baseToken.symbol}/${quoteToken.symbol}&order=timestamp.desc&limit=1`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrYWdweWZ6Z2N6Y2F4c3F3c29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDcxODAsImV4cCI6MjA1ODQ4MzE4MH0.hd1Os5VQkyGYLpY1bRBZ3ypy2wxdByFIzoUpk8qBRts'
          }
        }
      ).then(res => res.json());
        
      if (data && data.length > 0 && data[0].price) {
        // Add variation for more realistic data
        const variation = 0.95 + Math.random() * 0.1; // 0.95 - 1.05
        return {
          dexName: this.getName(),
          price: data[0].price * variation,
          fees: this.getTradingFeePercentage(),
          gasEstimate: 0.00001, // Solana gas is very low
          liquidityUSD: 500000,
          isFallback: true
        };
      }
      
      throw new Error('No fallback price available');
    } catch (error) {
      console.error('[RaydiumAdapter] Fallback error:', error);
      
      return {
        dexName: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.00001,
        liquidityUSD: 500000,
        isFallback: true
      };
    }
  }
}
