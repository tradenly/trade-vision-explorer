
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Raydium (Solana DEX)
 * We'll use Jupiter's API to get Raydium-specific quotes
 */
export class RaydiumAdapter extends BaseAdapter {
  private readonly JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
  
  constructor() {
    super('Raydium');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Raydium only works with Solana
      if (chainId !== 101) {
        return null;
      }
      
      // For Solana tokens, we'll use Jupiter API which aggregates Raydium
      // but we'll specify we only want to use Raydium as the market
      const jupiterUrl = `${this.JUPITER_QUOTE_API}?` +
        `inputMint=${baseTokenAddress}` +
        `&outputMint=${quoteTokenAddress}` +
        `&amount=1000000&slippageBps=50` +
        `&onlyDirectRoutes=true` +
        `&restrictIntermediateTokens=true` +
        `&platformFeeBps=0`;
      
      const response = await this.fetchWithRetry(jupiterUrl);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Filter for Raydium routes
      const isRaydiumRoute = data.data?.routes?.some(
        (route: any) => route.marketInfos?.some((info: any) => info.amm?.label === 'Raydium')
      );
      
      if (!isRaydiumRoute) {
        return null;
      }
      
      // Calculate price from route
      const inAmount = parseInt(data.data.inAmount) / 10 ** 9; // Solana uses 9 decimals
      const outAmount = parseInt(data.data.outAmount) / 10 ** 9;
      const price = outAmount / inAmount;
      
      return {
        source: this.getName().toLowerCase(),
        price,
        liquidity: this.estimateLiquidity('SOL', this.getName()),
        timestamp: Date.now(),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error fetching price from ${this.getName()}:`, error);
      return null;
    }
  }
}
