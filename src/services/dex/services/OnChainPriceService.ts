import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { supabase } from '@/lib/supabaseClient';
import DexRegistry from '../DexRegistry';

interface OnChainPrice {
  price: number;
  liquidity: number;
  timestamp: number;
  source: string;
}

/**
 * Service to fetch on-chain price data from various sources
 */
export class OnChainPriceService {
  private static instance: OnChainPriceService;
  private dexRegistry: DexRegistry;
  private apiSources: Record<number, string[]> = {
    1: ['1inch', 'coingecko', 'uniswap'],      // Ethereum
    56: ['1inch', 'pancakeswap', 'coingecko'], // BNB Chain
    137: ['1inch', 'quickswap', 'coingecko'],  // Polygon
    101: ['jupiter', 'raydium', 'orca'],       // Solana
    42161: ['1inch', 'coingecko'],             // Arbitrum
    10: ['1inch', 'coingecko'],                // Optimism
    8453: ['1inch', 'balancer', 'coingecko']   // Base
  };

  private cacheExpiryTime = 30000; // 30 seconds cache
  private priceCache: Map<string, {data: Record<string, OnChainPrice>, timestamp: number}> = new Map();

  private constructor() {
    this.dexRegistry = DexRegistry.getInstance();
  }

  public static getInstance(): OnChainPriceService {
    if (!OnChainPriceService.instance) {
      OnChainPriceService.instance = new OnChainPriceService();
    }
    return OnChainPriceService.instance;
  }

  /**
   * Get real-time on-chain prices for a token pair from multiple sources
   */
  public async getOnChainPrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    const now = Date.now();

    // Check cache first
    const cachedData = this.priceCache.get(cacheKey);
    if (cachedData && (now - cachedData.timestamp) < this.cacheExpiryTime) {
      console.log('Using cached price data');
      return this.convertToPriceQuotes(cachedData.data);
    }

    try {
      console.log(`Fetching on-chain prices for ${baseToken.symbol}/${quoteToken.symbol}`);
      
      // First try edge function for latest prices
      const edgeFunctionPrices = await this.fetchPricesFromEdgeFunction(baseToken, quoteToken);
      
      if (Object.keys(edgeFunctionPrices).length > 0) {
        // Store in cache
        this.priceCache.set(cacheKey, { 
          data: this.convertToOnChainPrices(edgeFunctionPrices),
          timestamp: now 
        });
        
        return edgeFunctionPrices;
      }
      
      // Fallback to database if edge function fails
      const dbPrices = await this.fetchLatestPricesFromDatabase(baseToken, quoteToken);
      
      if (Object.keys(dbPrices).length > 0) {
        // Store in cache
        this.priceCache.set(cacheKey, { 
          data: this.convertToOnChainPrices(dbPrices),
          timestamp: now 
        });
        
        return dbPrices;
      }
      
      // If all else fails, try adapters directly
      return await this.fetchPricesFromAdapters(baseToken, quoteToken);
    } catch (error) {
      console.error('Error fetching on-chain prices:', error);
      return {};
    }
  }

  /**
   * Convert OnChainPrice objects to PriceQuote format
   */
  private convertToPriceQuotes(prices: Record<string, OnChainPrice>): Record<string, PriceQuote> {
    const quotes: Record<string, PriceQuote> = {};
    
    Object.entries(prices).forEach(([dex, data]) => {
      quotes[dex] = {
        dexName: dex,
        price: data.price,
        fees: this.getDexFee(dex),
        gasEstimate: 0, // Will be calculated later
        liquidityUSD: data.liquidity,
        timestamp: data.timestamp
      };
    });
    
    return quotes;
  }

  /**
   * Convert PriceQuote objects to OnChainPrice format for caching
   */
  private convertToOnChainPrices(quotes: Record<string, PriceQuote>): Record<string, OnChainPrice> {
    const prices: Record<string, OnChainPrice> = {};
    
    Object.entries(quotes).forEach(([dex, quote]) => {
      prices[dex] = {
        price: quote.price,
        liquidity: quote.liquidityUSD || 100000,
        timestamp: quote.timestamp || Date.now(),
        source: dex
      };
    });
    
    return prices;
  }

  /**
   * Fetch prices from Edge Function
   */
  private async fetchPricesFromEdgeFunction(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { 
          baseToken: {
            address: baseToken.address,
            symbol: baseToken.symbol,
            decimals: baseToken.decimals,
            chainId: baseToken.chainId
          },
          quoteToken: {
            address: quoteToken.address,
            symbol: quoteToken.symbol,
            decimals: quoteToken.decimals,
            chainId: quoteToken.chainId
          }
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
        const priceData = data.prices[dex];
        quotes[dex] = {
          dexName: dex,
          price: priceData.price,
          fees: this.getDexFee(dex),
          gasEstimate: this.getGasEstimate(baseToken.chainId, dex),
          liquidityUSD: priceData.liquidity || 100000,
          timestamp: priceData.timestamp || Date.now(),
          isFallback: !!priceData.isFallback
        };
      }

      return quotes;
    } catch (error) {
      console.error('Error fetching prices from edge function:', error);
      return {};
    }
  }

  /**
   * Fetch latest prices from Supabase database
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
        throw error;
      }

      if (!data || data.length === 0) {
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
            fees: this.getDexFee(item.dex_name),
            gasEstimate: this.getGasEstimate(baseToken.chainId, item.dex_name),
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

  /**
   * Fetch prices directly from DEX adapters (last resort)
   */
  private async fetchPricesFromAdapters(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    try {
      const adapters = this.dexRegistry.getAdaptersForChain(baseToken.chainId);
      
      if (adapters.length === 0) {
        return {};
      }

      const quotePromises = adapters
        .filter(adapter => adapter.isEnabled())
        .map(async adapter => {
          try {
            const quote = await adapter.fetchQuote(baseToken, quoteToken);
            return { [adapter.getSlug()]: quote };
          } catch (error) {
            console.error(`Error fetching quote from ${adapter.getName()}:`, error);
            return null;
          }
        });

      const results = await Promise.allSettled(quotePromises);
      
      // Combine successful quotes
      return results.reduce((acc, result) => {
        if (result.status === 'fulfilled' && result.value) {
          return { ...acc, ...result.value };
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching prices from adapters:', error);
      return {};
    }
  }

  /**
   * Get DEX trading fee percentage
   */
  private getDexFee(dexName: string): number {
    const fees: Record<string, number> = {
      'uniswap': 0.003,     // 0.3%
      'sushiswap': 0.003,   // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'jupiter': 0.0035,    // 0.35%
      'orca': 0.003,        // 0.3%
      'raydium': 0.003,     // 0.3%
      'balancer': 0.002,    // 0.2%
      'curve': 0.0004       // 0.04%
    };

    return fees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
  }

  /**
   * Get gas estimate for chain and DEX
   */
  private getGasEstimate(chainId: number, dexName: string): number {
    // Base gas estimates by chain
    const chainGasBase: Record<number, number> = {
      1: 0.005,    // Ethereum
      56: 0.0005,  // BSC
      137: 0.001,  // Polygon
      101: 0.00001 // Solana
    };

    // Multipliers by DEX (relative to base)
    const dexMultipliers: Record<string, number> = {
      'uniswap': 1.0,
      'sushiswap': 1.1,
      'curve': 0.8,       // More gas efficient
      'balancer': 1.2,
      'jupiter': 1.0,
      'orca': 1.0,
      'raydium': 1.0,
      'pancakeswap': 0.9  // Slightly more efficient on BSC
    };

    const baseGas = chainGasBase[chainId] || 0.003;
    const multiplier = dexMultipliers[dexName.toLowerCase()] || 1.0;

    return baseGas * multiplier;
  }
}
