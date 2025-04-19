
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { supabase } from '@/lib/supabaseClient';

/**
 * Service for fetching real-time price data from DEXes
 */
export class RealTimePriceService {
  private static instance: RealTimePriceService;
  private cache: Map<string, { data: Record<string, PriceQuote>, timestamp: number }> = new Map();
  private cacheDuration = 20000; // 20 seconds
  private retryDelay = 2000; // 2 seconds
  private maxRetries = 2;
  
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
    quoteToken: TokenInfo,
    options = { forceRefresh: false, retries: 0 }
  ): Promise<Record<string, PriceQuote>> {
    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    const cachedData = this.cache.get(cacheKey);
    
    // Return cached data if it's fresh and forceRefresh is not set
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheDuration && !options.forceRefresh) {
      console.log('Using cached price data');
      return cachedData.data;
    }
    
    try {
      console.log(`Fetching real-time prices for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { baseToken, quoteToken }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data?.prices || Object.keys(data?.prices).length === 0) {
        console.warn('No price data received from API, falling back to database');
        return this.getFallbackPrices(baseToken, quoteToken);
      }
      
      // Convert to PriceQuote format
      const quotes: Record<string, PriceQuote> = {};
      
      for (const dex in data.prices) {
        quotes[dex] = {
          dexName: dex,
          price: data.prices[dex].price,
          fees: data.prices[dex].tradingFee || 0.003,
          gasEstimate: this.getGasEstimate(baseToken.chainId),
          liquidityUSD: data.prices[dex].liquidity || 100000,
          timestamp: data.prices[dex].timestamp || Date.now(),
          isFallback: !!data.prices[dex].isFallback,
          isMock: !!data.prices[dex].isMock
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
      
      // Implement retry with exponential backoff
      if (options.retries < this.maxRetries) {
        console.log(`Retrying price fetch (attempt ${options.retries + 1}/${this.maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, options.retries)));
        
        // Retry with incremented retry count
        return this.getPrices(baseToken, quoteToken, { 
          forceRefresh: options.forceRefresh, 
          retries: options.retries + 1 
        });
      }
      
      // If all retries fail, fallback to database
      console.log('All retries failed, falling back to database');
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
      
      console.log(`Fetching fallback prices from database for ${tokenPair}`);
      
      const { data } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', tokenPair)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(20);
      
      const quotes: Record<string, PriceQuote> = {};
      const processedDexes = new Set<string>();
      
      if (data && data.length > 0) {
        // Group by DEX and get most recent price for each
        data.forEach(item => {
          if (!processedDexes.has(item.dex_name)) {
            processedDexes.add(item.dex_name);
            
            quotes[item.dex_name] = {
              dexName: item.dex_name,
              price: item.price,
              fees: this.getDexFee(item.dex_name),
              gasEstimate: this.getGasEstimate(baseToken.chainId),
              liquidityUSD: item.liquidity || 100000,
              timestamp: new Date(item.timestamp).getTime(),
              isFallback: true
            };
          }
        });
        
        console.log(`Found ${Object.keys(quotes).length} DEXes with prices in database`);
      }
      
      // If no database prices, generate mock data as last resort
      if (Object.keys(quotes).length === 0) {
        console.log('No database prices found, generating mock data');
        return this.generateMockPrices(baseToken, quoteToken);
      }
      
      return quotes;
    } catch (error) {
      console.error('Error fetching fallback prices:', error);
      return this.generateMockPrices(baseToken, quoteToken);
    }
  }
  
  /**
   * Generate mock prices as last resort
   */
  private generateMockPrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Record<string, PriceQuote> {
    console.log('Generating mock prices');
    
    const mockPrice = baseToken.symbol === 'ETH' ? 3200 : 
                     baseToken.symbol === 'BTC' ? 65000 :
                     baseToken.symbol === 'SOL' ? 150 :
                     baseToken.symbol === 'BNB' ? 550 : 10;
    
    // Generate slightly different prices for each DEX
    const dexes = baseToken.chainId === 101 ? 
      ['jupiter', 'orca', 'raydium'] :
      baseToken.chainId === 56 ?
      ['pancakeswap', 'apeswap', 'biswap'] :
      ['uniswap', 'sushiswap', 'curve'];
    
    const quotes: Record<string, PriceQuote> = {};
    
    dexes.forEach((dex, index) => {
      // Add a small percentage difference to each DEX
      const priceModifier = 1 + (index - 1) * 0.02; // -2%, 0%, +2%
      
      quotes[dex] = {
        dexName: dex,
        price: mockPrice * priceModifier,
        fees: this.getDexFee(dex),
        gasEstimate: this.getGasEstimate(baseToken.chainId),
        liquidityUSD: 1000000,
        timestamp: Date.now(),
        isFallback: true,
        isMock: true
      };
    });
    
    return quotes;
  }
  
  /**
   * Clear the price cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get typical trading fee for a DEX
   */
  private getDexFee(dexName: string): number {
    const fees: Record<string, number> = {
      'uniswap': 0.003, // 0.3%
      'sushiswap': 0.003, // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'jupiter': 0.0035, // 0.35%
      'orca': 0.003, // 0.3%
      'raydium': 0.003, // 0.3%
      'curve': 0.0004, // 0.04%
      '1inch': 0.003 // 0.3%
    };
    
    return fees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
  }
  
  /**
   * Get gas estimate for a chain
   */
  private getGasEstimate(chainId: number): number {
    switch (chainId) {
      case 1: // Ethereum
        return 5; // $5 per transaction
      case 56: // BSC
        return 0.5; // $0.50 per transaction
      case 101: // Solana
        return 0.01; // $0.01 per transaction
      default:
        return 1; // Default $1 per transaction
    }
  }
}

export default RealTimePriceService;
