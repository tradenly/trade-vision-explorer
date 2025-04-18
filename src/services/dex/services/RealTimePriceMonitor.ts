
import { TokenInfo } from '@/services/tokenListService';
import { supabase } from '@/lib/supabaseClient';
import { PriceService } from './PriceService';
import { PriceQuote } from '../types';
import { toast } from '@/hooks/use-toast';

/**
 * Service to monitor price changes in real-time
 */
export class RealTimePriceMonitor {
  private static instance: RealTimePriceMonitor;
  private priceService: PriceService;
  private monitoredPairs: Map<string, { lastFetched: number, interval: NodeJS.Timeout }> = new Map();
  private pollingInterval: number = 15000; // 15 seconds between polls
  private subscriberCount: Map<string, number> = new Map();
  private webSocketConnections: Map<string, any> = new Map();
  private connectionStatus: Map<string, boolean> = new Map();
  
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
    
    // Try to establish WebSocket connection for real-time updates
    this.setupWebSocketConnection(baseToken, quoteToken);
    
    // Set up interval to fetch prices as backup
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
    
    // Notify user
    toast({
      title: "Price Monitoring Started",
      description: `Monitoring ${baseToken.symbol}/${quoteToken.symbol} prices`,
    });
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
    
    // Close WebSocket connection if exists
    if (this.webSocketConnections.has(pairKey)) {
      const connection = this.webSocketConnections.get(pairKey);
      if (connection && connection.close) {
        connection.close();
      }
      this.webSocketConnections.delete(pairKey);
      this.connectionStatus.delete(pairKey);
    }
    
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
      return ['pancakeswap', '1inch'];
    } else {
      // Ethereum and others
      return ['uniswap', 'sushiswap', '1inch', 'curve'];
    }
  }
  
  /**
   * Set up WebSocket connection for real-time price updates
   */
  private setupWebSocketConnection(baseToken: TokenInfo, quoteToken: TokenInfo): void {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    
    // For now we'll use Supabase Realtime as a proxy
    try {
      const channel = supabase.channel(`price-updates-${pairKey}`)
        .on('broadcast', { event: 'price-update' }, (payload) => {
          if (payload.payload.pairKey === pairKey) {
            // Update connection status
            this.connectionStatus.set(pairKey, true);
            
            // Process and broadcast the prices
            this.broadcastPrices(pairKey, payload.payload.quotes);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`WebSocket connected for ${pairKey}`);
            this.connectionStatus.set(pairKey, true);
          } else {
            console.log(`WebSocket status for ${pairKey}: ${status}`);
          }
        });
        
      // Store the connection
      this.webSocketConnections.set(pairKey, channel);
      
    } catch (error) {
      console.error(`Error setting up WebSocket for ${pairKey}:`, error);
      this.connectionStatus.set(pairKey, false);
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
      
      // Check if WebSocket is working, if not use the Edge Function for real-time prices
      if (!this.connectionStatus.get(pairKey)) {
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
        
        if (data && data.prices) {
          // Broadcast the prices to the price-updates channel
          this.broadcastPrices(pairKey, data.prices);
        }
      }
    } catch (error) {
      console.error('Error fetching and broadcasting prices:', error);
    }
  }
  
  /**
   * Broadcast prices to subscribers
   */
  private broadcastPrices(pairKey: string, prices: Record<string, PriceQuote>): void {
    // The channel will broadcast to all subscribers
    supabase.channel('price-updates').send({
      type: 'broadcast',
      event: 'price-update',
      payload: {
        pairKey,
        quotes: prices,
        timestamp: Date.now()
      }
    });
  }
  
  /**
   * Generate a unique key for a token pair
   */
  private getPairKey(baseToken: TokenInfo, quoteToken: TokenInfo): string {
    return `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`;
  }
  
  /**
   * Check if a pair is being monitored
   */
  public isMonitoring(baseToken: TokenInfo, quoteToken: TokenInfo): boolean {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    return this.monitoredPairs.has(pairKey);
  }
  
  /**
   * Get connection status for a pair
   */
  public getConnectionStatus(baseToken: TokenInfo, quoteToken: TokenInfo): boolean {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    return this.connectionStatus.get(pairKey) || false;
  }
}
