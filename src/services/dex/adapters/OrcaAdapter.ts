
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote, DexConfig } from '../types';
import { TokenInfo } from '../../tokenListService';
import { orcaRateLimiter } from '../utils/rateLimiter';

export class OrcaAdapter extends BaseAdapter {
  constructor(config: DexConfig) {
    super(config);
  }

  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      await orcaRateLimiter.waitForSlot();

      if (baseToken.chainId !== 101) {
        throw new Error('Orca only supports Solana blockchain');
      }

      // Convert amount to Solana decimals
      const amountInLamports = Math.floor(amount * Math.pow(10, baseToken.decimals || 9));
      
      // Use Jupiter's quote API but filter for Orca routes only
      const url = `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amountInLamports}&onlyDirectRoutes=true&asLegacyTransaction=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Verify we have an Orca route
      const isOrcaRoute = data.routePlan?.some(
        (route: any) => route.swapInfo && route.swapInfo.label === 'Orca'
      );
      
      if (!isOrcaRoute) {
        throw new Error('No Orca liquidity found for this pair');
      }
      
      // Calculate price from route
      const inAmount = data.inAmount / Math.pow(10, baseToken.decimals || 9);
      const outAmount = data.outAmount / Math.pow(10, quoteToken.decimals || 9);
      const price = outAmount / inAmount;
      
      // Get Solana network fees
      const baseFeeInLamports = 5000;  // Base transaction fee
      const priorityFeeInLamports = 1000;  // Priority fee
      const totalFeeInSOL = (baseFeeInLamports + priorityFeeInLamports) / 1e9;
      const solPrice = 150;  // Estimated SOL price
      const gasEstimateUSD = totalFeeInSOL * solPrice;

      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: gasEstimateUSD,
        liquidityUSD: data.marketInfos?.[0]?.liquidity || 100000,
        liquidityInfo: {
          routes: data.routePlan || [],
          marketInfos: data.marketInfos || []
        },
        timestamp: Date.now() // Add timestamp
      };

    } catch (error) {
      console.error(`[OrcaAdapter] Error:`, error);
      return this.getFallbackQuote(baseToken, quoteToken);
    }
  }

  private async getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      const { data } = await fetch(
        `https://fkagpyfzgczcaxsqwsoi.supabase.co/rest/v1/dex_price_history?dex_name=eq.orca&token_pair=eq.${baseToken.symbol}/${quoteToken.symbol}&order=timestamp.desc&limit=1`,
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
          gasEstimate: 0.00001, // Solana gas is very low
          liquidityUSD: 600000,
          isFallback: true,
          timestamp: Date.now() // Add timestamp
        };
      }
      
      throw new Error('No fallback price available');
    } catch (error) {
      console.error('[OrcaAdapter] Fallback error:', error);
      return {
        dexName: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.00001,
        liquidityUSD: 600000,
        isFallback: true,
        timestamp: Date.now() // Add timestamp
      };
    }
  }
}
