
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';
import DexRegistry from '../DexRegistry';
import { supabase } from '@/lib/supabaseClient';

export class PriceAggregationService {
  private static instance: PriceAggregationService;
  
  private constructor() {}
  
  public static getInstance(): PriceAggregationService {
    if (!PriceAggregationService.instance) {
      PriceAggregationService.instance = new PriceAggregationService();
    }
    return PriceAggregationService.instance;
  }
  
  /**
   * Aggregate quotes from multiple DEXes and store them
   */
  public async aggregatePrices(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, PriceQuote>> {
    try {
      console.log(`[PriceAggregation] Fetching prices for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // Get DEX registry instance
      const dexRegistry = DexRegistry.getInstance();
      const adapters = dexRegistry.getAdaptersForChain(baseToken.chainId);
      
      if (adapters.length === 0) {
        console.warn(`No adapters available for chain ${baseToken.chainId}`);
        return {};
      }

      // Fetch prices from all DEXes concurrently
      const priceQuotes: Record<string, PriceQuote> = {};
      const quotePromises = adapters.map(async (adapter) => {
        if (!adapter.isEnabled()) return;
        
        try {
          const quote = await adapter.fetchQuote(baseToken, quoteToken);
          priceQuotes[adapter.getName().toLowerCase()] = quote;
          
          // Store price in database
          await this.storePriceData(baseToken, quoteToken, quote);
        } catch (error) {
          console.error(`Error fetching quote from ${adapter.getName()}:`, error);
        }
      });

      // Wait for all price fetching to complete
      await Promise.allSettled(quotePromises);
      
      return priceQuotes;
    } catch (error) {
      console.error(`Error in aggregatePrices:`, error);
      return {};
    }
  }
  
  /**
   * Store price data in Supabase
   */
  private async storePriceData(baseToken: TokenInfo, quoteToken: TokenInfo, quote: PriceQuote): Promise<void> {
    try {
      const priceRecord = {
        dex_name: quote.dexName.toLowerCase(),
        token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
        chain_id: baseToken.chainId,
        price: quote.price,
        liquidity: quote.liquidityUSD
      };
      
      await supabase
        .from('dex_price_history')
        .insert(priceRecord);
    } catch (error) {
      console.error(`Error storing price data:`, error);
    }
  }
  
  /**
   * Get historical price data for a token pair
   */
  public async getHistoricalPrices(
    baseToken: TokenInfo, 
    quoteToken: TokenInfo, 
    dexName?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (dexName) {
        query = query.eq('dex_name', dexName.toLowerCase());
      }
        
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error(`Error getting historical prices:`, error);
      return [];
    }
  }
}
