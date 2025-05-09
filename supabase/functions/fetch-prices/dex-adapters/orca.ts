
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';

/**
 * Adapter for Orca (Solana DEX)
 * Also uses Jupiter's API to get Orca-specific quotes
 */
export class OrcaAdapter extends BaseAdapter {
  private readonly JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
  
  constructor() {
    super('Orca');
  }
  
  async getPrice(
    baseTokenAddress: string, 
    quoteTokenAddress: string, 
    chainId: number
  ): Promise<PriceResult | null> {
    try {
      // Orca only works with Solana
      if (chainId !== 101) {
        return null;
      }
      
      // Use Jupiter's API but filter for Orca routes
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
      
      // Filter for Orca routes
      const isOrcaRoute = data.data?.routes?.some(
        (route: any) => route.marketInfos?.some((info: any) => info.amm?.label === 'Orca')
      );
      
      if (!isOrcaRoute) {
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
