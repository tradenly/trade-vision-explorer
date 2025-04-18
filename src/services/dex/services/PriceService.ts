
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import DexRegistry from '../DexRegistry';

export class PriceService {
  private dexRegistry: DexRegistry;
  
  constructor(dexRegistry: DexRegistry) {
    this.dexRegistry = dexRegistry;
  }
  
  /**
   * Fetches latest prices for a token pair across all supported DEXs
   */
  public async fetchLatestPricesForPair(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const adapters = this.dexRegistry.getAdaptersForChain(baseToken.chainId);
      
      // Fetch quotes from all adapters concurrently
      const quotePromises = adapters.map(async adapter => {
        try {
          const quote = await adapter.fetchQuote(baseToken, quoteToken);
          return { [adapter.getSlug()]: quote };
        } catch (error) {
          console.error(`Error fetching quote from ${adapter.getName()}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(quotePromises);
      
      // Combine all successful quotes
      return results.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value) {
          return { ...acc, ...result.value };
        }
        return acc;
      }, {});
      
    } catch (error) {
      console.error('Error fetching prices:', error);
      return {};
    }
  }
}
