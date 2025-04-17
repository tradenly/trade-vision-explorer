
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from './tokenListService';
import DexRegistry from './dex/DexRegistry';
import { applyBackoff, errorTracker } from './dex/utils/rateLimiter';

export async function fetchAndStorePriceData(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): Promise<void> {
  const dexRegistry = DexRegistry.getInstance();
  const adapters = dexRegistry.getAdaptersForChain(baseToken.chainId);
  const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;

  for (const adapter of adapters) {
    try {
      // Get the adapter name and ensure it's a valid key for the errorTracker
      const adapterName = adapter.getName().toLowerCase();
      const validDexName = adapterName as keyof typeof errorTracker;
      
      // Apply backoff if there were previous errors
      await applyBackoff(validDexName);
      
      const quote = await adapter.fetchQuote(baseToken, quoteToken);
      
      if (quote) {
        await supabase.from('dex_price_history').insert({
          dex_name: adapterName,
          token_pair: tokenPair,
          chain_id: baseToken.chainId,
          price: quote.price,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error fetching price from ${adapter.getName()}:`, error);
      // Update error tracking for backoff
      const adapterName = adapter.getName().toLowerCase();
      const tracker = errorTracker[adapterName as keyof typeof errorTracker];
      if (tracker) {
        tracker.consecutiveErrors++;
        tracker.lastErrorTime = Date.now();
      }
    }
  }
}
