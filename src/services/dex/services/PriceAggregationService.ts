
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import DexRegistry from '../DexRegistry';
import { getLatestPriceData } from '@/services/priceHistoryService';

/**
 * Service to aggregate prices from multiple DEXes
 */
export class PriceAggregationService {
  private static instance: PriceAggregationService;
  private dexRegistry: DexRegistry;

  private constructor() {
    this.dexRegistry = DexRegistry.getInstance();
  }

  public static getInstance(): PriceAggregationService {
    if (!PriceAggregationService.instance) {
      PriceAggregationService.instance = new PriceAggregationService();
    }
    return PriceAggregationService.instance;
  }

  /**
   * Aggregates prices from all available DEXes
   * @param baseToken Base token (e.g. ETH)
   * @param quoteToken Quote token (e.g. USDC)
   * @returns Map of DEX name to price quote
   */
  public async aggregatePrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo
  ): Promise<Record<string, PriceQuote>> {
    console.log(`Aggregating prices for ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);
    
    try {
      // Get adapters for the specified chain
      const adapters = this.dexRegistry.getAdaptersForChain(baseToken.chainId);
      console.log(`Found ${adapters.length} DEX adapters for chain ${baseToken.chainId}`);
      
      if (adapters.length === 0) {
        console.warn(`No DEX adapters available for chain ${baseToken.chainId}`);
        return {};
      }
      
      // Fetch quotes from all adapters in parallel
      const quotePromises = adapters
        .filter(adapter => adapter.isEnabled())
        .map(async adapter => {
          try {
            console.log(`Fetching quote from ${adapter.getName()}`);
            const quote = await adapter.fetchQuote(baseToken, quoteToken);
            
            if (quote) {
              // Enhance quote with additional metadata
              const enhancedQuote: PriceQuote = {
                ...quote,
                dexName: adapter.getSlug(),
                fees: adapter instanceof Object && 'getTradingFeePercentage' in adapter 
                  ? (adapter as any).getTradingFeePercentage() 
                  : 0.003, // Default 0.3%
                timestamp: Date.now(),
                // Set default values for liquidity if not provided
                liquidityUSD: quote.liquidityUSD || this.estimateLiquidity(baseToken, adapter.getSlug()),
                isBuy: true, // Default to buy direction
                liquidityInfo: quote.liquidityInfo || {} // Ensure liquidityInfo exists
              };
              
              return { [adapter.getSlug()]: enhancedQuote };
            }
            return null;
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
      console.error('Error aggregating prices:', error);
      return {};
    }
  }

  /**
   * Get historical price data for a token pair
   * @param baseToken Base token (e.g. ETH)
   * @param quoteToken Quote token (e.g. USDC)
   * @param dexName Optional DEX name to filter by
   * @param limit Maximum number of data points to return
   * @returns Array of price history data points
   */
  public async getHistoricalPrices(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    dexName?: string,
    limit: number = 100
  ) {
    try {
      // Create token pair string (e.g. "ETH/USDC")
      const tokenPair = `${baseToken.symbol}/${quoteToken?.symbol || 'USD'}`;
      
      // Use the priceHistoryService to get the data
      const priceHistory = await getLatestPriceData(tokenPair, limit);
      
      // Filter by DEX name if provided
      if (dexName) {
        return priceHistory.filter(item => item.dexName.toLowerCase() === dexName.toLowerCase());
      }
      
      return priceHistory;
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      return [];
    }
  }

  /**
   * Estimate liquidity based on token and DEX
   */
  private estimateLiquidity(token: TokenInfo, dexName: string): number {
    // Base liquidity estimation on token market cap or popularity
    // These are rough estimates when real liquidity data is unavailable
    const baseEstimates: Record<string, number> = {
      'ETH': 10000000,
      'WETH': 10000000,
      'BTC': 15000000,
      'WBTC': 15000000,
      'SOL': 5000000,
      'BNB': 3000000,
      'MATIC': 2000000,
      'AVAX': 1500000,
      'LINK': 1000000,
      'UNI': 800000,
      'AAVE': 700000,
      'USDC': 20000000,
      'USDT': 20000000,
      'DAI': 8000000
    };
    
    const symbol = token.symbol.toUpperCase();
    const baseLiquidity = baseEstimates[symbol] || 500000; // Default $500k
    
    // Apply DEX-specific modifier
    const dexLiquidityModifiers: Record<string, number> = {
      'uniswap': 1.0,
      'sushiswap': 0.7,
      'pancakeswap': 0.9,
      'curve': 1.2,
      'balancer': 0.8,
      'jupiter': 1.0,
      'orca': 0.8,
      'raydium': 0.75
    };
    
    const dexModifier = dexLiquidityModifiers[dexName.toLowerCase()] || 0.5;
    
    return baseLiquidity * dexModifier;
  }
}
