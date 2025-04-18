
import { TokenInfo } from '@/services/tokenListService';
import { supabase } from '@/lib/supabaseClient';
import { PriceService } from './PriceService';
import { PriceQuote } from '../types';

/**
 * Service to monitor price changes in real-time
 */
export class RealTimePriceMonitor {
  private static instance: RealTimePriceMonitor;
  private priceService: PriceService;
  private monitoredPairs: Map<string, { lastFetched: number, interval: NodeJS.Timeout }> = new Map();
  private pollingInterval: number = 15000; // 15 seconds between polls
  private subscriberCount: Map<string, number> = new Map();
  
  private constructor(priceService: PriceService) {
    this.priceService = priceService;
  }
  
  public static getInstance(priceService: PriceService): RealTimePriceMonitor {
    if (!RealTimePriceMonitor.instance) {
      RealTimePriceMonitor.instance = new RealTimePriceMonitor(priceService);
    }
    return RealTimePriceMonitor.instance;
  }
  
  /**
   * Start monitoring a token pair for price changes
   * @param baseToken Base token (e.g. ETH)
   * @param quoteToken Quote token (e.g. USDC)
   */
  public startMonitoring(baseToken: TokenInfo, quoteToken: TokenInfo): void {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    
    // Increment subscriber count
    const currentSubscribers = this.subscriberCount.get(pairKey) || 0;
    this.subscriberCount.set(pairKey, currentSubscribers + 1);
    
    // If already monitoring, just return
    if (this.monitoredPairs.has(pairKey)) {
      return;
    }
    
    console.log(`Starting price monitoring for ${pairKey}`);
    
    // Set up interval to fetch prices
    const interval = setInterval(async () => {
      try {
        await this.fetchAndBroadcastPrices(baseToken, quoteToken);
      } catch (error) {
        console.error(`Error monitoring ${pairKey}:`, error);
      }
    }, this.pollingInterval);
    
    // Store the interval reference
    this.monitoredPairs.set(pairKey, { 
      lastFetched: Date.now(),
      interval
    });
    
    // Fetch immediately for first time
    this.fetchAndBroadcastPrices(baseToken, quoteToken);
  }
  
  /**
   * Stop monitoring a token pair
   * @param baseToken Base token
   * @param quoteToken Quote token
   */
  public stopMonitoring(baseToken: TokenInfo, quoteToken: TokenInfo): void {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    
    // Decrement subscriber count
    const currentSubscribers = this.subscriberCount.get(pairKey) || 0;
    if (currentSubscribers > 1) {
      this.subscriberCount.set(pairKey, currentSubscribers - 1);
      return;
    }
    
    // Last subscriber, clean up
    this.subscriberCount.delete(pairKey);
    
    // If not monitoring, just return
    if (!this.monitoredPairs.has(pairKey)) {
      return;
    }
    
    console.log(`Stopping price monitoring for ${pairKey}`);
    
    // Clear the interval
    const { interval } = this.monitoredPairs.get(pairKey)!;
    clearInterval(interval);
    
    // Remove from monitored pairs
    this.monitoredPairs.delete(pairKey);
  }
  
  /**
   * Get all DEXes that should be monitored for a token pair
   */
  private getDexesToMonitor(baseToken: TokenInfo): string[] {
    if (baseToken.chainId === 101) {
      // Solana
      return ['jupiter', 'orca', 'raydium'];
    } else if (baseToken.chainId === 56) {
      // BSC
      return ['1inch', 'pancakeswap'];
    } else {
      // Ethereum and others
      return ['uniswap', 'sushiswap', '1inch', 'curve'];
    }
  }
  
  /**
   * Fetch and broadcast the latest prices to listening clients
   */
  private async fetchAndBroadcastPrices(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<void> {
    try {
      const pairKey = this.getPairKey(baseToken, quoteToken);
      const monitoring = this.monitoredPairs.get(pairKey);
      
      if (!monitoring) return;
      
      // Throttle updates
      const now = Date.now();
      if (now - monitoring.lastFetched < this.pollingInterval) {
        return;
      }
      
      monitoring.lastFetched = now;
      
      // Get DEXes to monitor for this chain
      const dexNames = this.getDexesToMonitor(baseToken);
      
      // Use the Edge Function for real-time prices
      const { data, error } = await supabase.functions.invoke('real-time-prices', {
        body: { 
          baseToken,
          quoteToken,
          dexNames
        }
      });
      
      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      // The edge function will broadcast the prices to the channel
    } catch (error) {
      console.error('Error fetching and broadcasting prices:', error);
    }
  }
  
  /**
   * Generate a unique key for a token pair
   */
  private getPairKey(baseToken: TokenInfo, quoteToken: TokenInfo): string {
    return `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`;
  }
}
