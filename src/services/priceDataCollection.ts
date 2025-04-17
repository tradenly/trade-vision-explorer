
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
      // Apply backoff if there were previous errors
      await applyBackoff(adapter.getName().toLowerCase());
      
      const quote = await adapter.fetchQuote(baseToken, quoteToken);
      
      if (quote) {
        await supabase.from('dex_price_history').insert({
          dex_name: adapter.getName().toLowerCase(),
          token_pair: tokenPair,
          chain_id: baseToken.chainId,
          price: quote.price,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error fetching price from ${adapter.getName()}:`, error);
      // Update error tracking for backoff
      const tracker = errorTracker[adapter.getName().toLowerCase()];
      if (tracker) {
        tracker.consecutiveErrors++;
        tracker.lastErrorTime = Date.now();
      }
    }
  }
}
