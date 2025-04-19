
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { supabase } from '@/lib/supabaseClient';

/**
 * Service for fetching real-time price data from DEXes
 */
export class RealTimePriceService {
  private static instance: RealTimePriceService;
  private cache: Map<string, { data: Record<string, PriceQuote>, timestamp: number }> = new Map();
  private cacheDuration = 30000; // 30 seconds
  
  private constructor() {}
  
  public static getInstance(): RealTimePriceService {
    if (!RealTimePriceService.instance) {
      RealTimePriceService.instance = new RealTimePriceService();
    }
    return RealTimePriceService.instance;
  }
  
  /**
   * Get real-time prices for a token pair across multiple DEXes
   */
  public async getPrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    const cachedData = this.cache.get(cacheKey);
    
    // Return cached data if it's fresh
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheDuration) {
      return cachedData.data;
    }
    
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { baseToken, quoteToken }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data?.prices) {
        throw new Error('No price data received');
      }
      
      // Convert to PriceQuote format
      const quotes: Record<string, PriceQuote> = {};
      
      for (const dex in data.prices) {
        quotes[dex] = {
          dexName: dex,
          price: data.prices[dex].price,
          fees: data.prices[dex].tradingFee || 0.003,
          gasEstimate: baseToken.chainId === 101 ? 0.00001 : 0.005,
          liquidityUSD: data.prices[dex].liquidity || 100000,
          timestamp: data.prices[dex].timestamp || Date.now()
        };
      }
      
      // Update cache
      this.cache.set(cacheKey, {
        data: quotes,
        timestamp: Date.now()
      });
      
      return quotes;
    } catch (error) {
      console.error('Error fetching real-time prices:', error);
      
      // Fallback to database
      return this.getFallbackPrices(baseToken, quoteToken);
    }
  }
  
  /**
   * Fallback method to retrieve prices from database
   */
  private async getFallbackPrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      
      const { data } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', tokenPair)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      const quotes: Record<string, PriceQuote> = {};
      const processedDexes = new Set<string>();
      
      if (data) {
        // Group by DEX and get most recent price for each
        data.forEach(item => {
          if (!processedDexes.has(item.dex_name)) {
            processedDexes.add(item.dex_name);
            
            quotes[item.dex_name] = {
              dexName: item.dex_name,
              price: item.price,
              fees: 0.003, // Default fee
              gasEstimate: baseToken.chainId === 101 ? 0.00001 : 0.005,
              liquidityUSD: item.liquidity || 100000,
              timestamp: new Date(item.timestamp).getTime()
            };
          }
        });
      }
      
      return quotes;
    } catch (error) {
      console.error('Error fetching fallback prices:', error);
      return {};
    }
  }
  
  /**
   * Clear the price cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export default RealTimePriceService;
