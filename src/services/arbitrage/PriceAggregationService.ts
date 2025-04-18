
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { getDexFee, getGasEstimate } from './utils';
import { supabase } from '@/lib/supabaseClient';

/**
 * Service to aggregate and update price data from multiple sources
 */
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
   * Fetches and aggregates prices from multiple sources
   */
  public async aggregatePrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      console.log(`Aggregating prices for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // First try to get from Supabase Edge Function
      const edgeFunctionPrices = await this.fetchPricesFromEdgeFunction(baseToken, quoteToken);
      if (Object.keys(edgeFunctionPrices).length > 0) {
        return edgeFunctionPrices;
      }
      
      // Fallback to DB if the edge function doesn't return data
      return this.fetchLatestPricesFromDatabase(baseToken, quoteToken);
    } catch (error) {
      console.error('Error in aggregatePrices:', error);
      return this.fetchLatestPricesFromDatabase(baseToken, quoteToken);
    }
  }

  /**
   * Fetches prices using the Supabase Edge Function
   */
  private async fetchPricesFromEdgeFunction(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { 
          baseToken, 
          quoteToken
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return {};
      }

      if (!data || !data.prices) {
        return {};
      }

      // Convert to PriceQuote format
      const quotes: Record<string, PriceQuote> = {};
      
      for (const dex in data.prices) {
        quotes[dex] = {
          dexName: dex,
          price: data.prices[dex].price,
          fees: getDexFee(dex),
          gasEstimate: getGasEstimate(baseToken.chainId, dex),
          liquidityUSD: data.prices[dex].liquidity || 100000,
          timestamp: Date.now()
        };
      }

      return quotes;
    } catch (error) {
      console.error('Error fetching prices from edge function:', error);
      return {};
    }
  }

  /**
   * Fetches the latest prices from the database
   */
  private async fetchLatestPricesFromDatabase(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      
      const { data, error } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', tokenPair)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Database query error:', error);
        return {};
      }

      const quotes: Record<string, PriceQuote> = {};
      const processedDexes = new Set<string>();

      // Get the most recent price for each DEX
      data.forEach(item => {
        if (!processedDexes.has(item.dex_name)) {
          processedDexes.add(item.dex_name);
          
          quotes[item.dex_name] = {
            dexName: item.dex_name,
            price: item.price,
            fees: getDexFee(item.dex_name),
            gasEstimate: getGasEstimate(baseToken.chainId, item.dex_name),
            liquidityUSD: item.liquidity || 100000,
            timestamp: new Date(item.timestamp).getTime()
          };
        }
      });

      return quotes;
    } catch (error) {
      console.error('Error fetching prices from database:', error);
      return {};
    }
  }
}
