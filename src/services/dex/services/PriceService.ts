
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import DexRegistry from '../DexRegistry';
import { DexPersistenceService } from './dexPersistenceService';

export class PriceService {
  private persistenceService: DexPersistenceService;
  private dexRegistry: DexRegistry;

  constructor(dexRegistry: DexRegistry) {
    this.dexRegistry = dexRegistry;
    this.persistenceService = new DexPersistenceService();
  }

  public async fetchLatestPricesForPair(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, PriceQuote>> {
    try {
      const adapters = this.dexRegistry.getAdaptersForChain(baseToken.chainId);
      const results: Record<string, PriceQuote> = {};
      
      const promises = adapters.map(async (adapter) => {
        try {
          const quote = await adapter.fetchQuote(baseToken, quoteToken);
          if (quote) {
            results[adapter.getName()] = quote;
          }
        } catch (error) {
          console.error(`Error fetching price from ${adapter.getName()}:`, error);
        }
      });
      
      await Promise.all(promises);
      
      await this.persistenceService.storePriceData(baseToken, quoteToken, results);
      
      return results;
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return {};
    }
  }
}
