
import { supabase } from '@/lib/supabaseClient';
import { DexConfig, PriceQuote } from '../types';
import { TokenInfo } from '@/services/tokenListService';

export class DexPersistenceService {
  async loadConfigFromSupabase(): Promise<DexConfig[]> {
    const { data, error } = await supabase
      .from('dex_settings')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async saveConfigToSupabase(configs: DexConfig[]): Promise<void> {
    const configsToSave = configs.map(config => ({
      name: config.name,
      slug: config.slug,
      chain_ids: config.chainIds,
      trading_fee_percentage: config.tradingFeePercentage,
      enabled: config.enabled
    }));

    const { error } = await supabase
      .from('dex_settings')
      .upsert(configsToSave, { onConflict: 'slug' });

    if (error) throw error;
  }

  async storePriceData(baseToken: TokenInfo, quoteToken: TokenInfo, prices: Record<string, PriceQuote>): Promise<void> {
    const pricesToStore = Object.entries(prices).map(([dexName, quote]) => ({
      dex_name: dexName,
      token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      chain_id: baseToken.chainId,
      price: quote.price,
      timestamp: new Date().toISOString()
    }));
    
    if (pricesToStore.length > 0) {
      const { error } = await supabase
        .from('dex_price_history')
        .insert(pricesToStore);
      
      if (error) {
        console.error('Failed to store price data:', error);
      }
    }
  }
}
