
import { PriceService } from './PriceService';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '../types';
import { supabase } from '@/lib/supabaseClient';

export class RealTimePriceMonitor {
  private static instance: RealTimePriceMonitor;
  private priceService: PriceService;
  private monitoredPairs: Map<string, { baseToken: TokenInfo; quoteToken: TokenInfo }> = new Map();
  private updateInterval: number = 10000; // 10 seconds
  private intervalId?: NodeJS.Timeout;

  private constructor(priceService: PriceService) {
    this.priceService = priceService;
  }

  public static getInstance(priceService: PriceService): RealTimePriceMonitor {
    if (!RealTimePriceMonitor.instance) {
      RealTimePriceMonitor.instance = new RealTimePriceMonitor(priceService);
    }
    return RealTimePriceMonitor.instance;
  }

  public startMonitoring(baseToken: TokenInfo, quoteToken: TokenInfo): void {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    
    if (!this.monitoredPairs.has(pairKey)) {
      this.monitoredPairs.set(pairKey, { baseToken, quoteToken });
      console.log(`Started monitoring ${pairKey}`);
    }

    if (!this.intervalId) {
      this.intervalId = setInterval(() => this.updatePrices(), this.updateInterval);
      this.updatePrices(); // Initial update
    }
  }

  public stopMonitoring(baseToken: TokenInfo, quoteToken: TokenInfo): void {
    const pairKey = this.getPairKey(baseToken, quoteToken);
    this.monitoredPairs.delete(pairKey);

    if (this.monitoredPairs.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async updatePrices(): Promise<void> {
    for (const [pairKey, { baseToken, quoteToken }] of this.monitoredPairs) {
      try {
        console.log(`Updating prices for ${pairKey}`);
        const quotes = await this.priceService.fetchLatestPricesForPair(baseToken, quoteToken);
        
        // Store prices in Supabase for analysis
        await this.storePrices(baseToken, quoteToken, quotes);
        
        // Emit real-time update through Supabase
        await this.emitPriceUpdate(pairKey, quotes);
      } catch (error) {
        console.error(`Error updating prices for ${pairKey}:`, error);
      }
    }
  }

  private async storePrices(
    baseToken: TokenInfo, 
    quoteToken: TokenInfo, 
    quotes: Record<string, PriceQuote>
  ): Promise<void> {
    const priceRecords = Object.entries(quotes).map(([dexName, quote]) => ({
      dex_name: dexName.toLowerCase(),
      token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      chain_id: baseToken.chainId,
      price: quote.price,
      timestamp: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('dex_price_history')
      .insert(priceRecords);

    if (error) {
      console.error('Error storing price data:', error);
    }
  }

  private async emitPriceUpdate(pairKey: string, quotes: Record<string, PriceQuote>): Promise<void> {
    await supabase.channel('price-updates')
      .send({
        type: 'broadcast',
        event: 'price-update',
        payload: { pairKey, quotes }
      });
  }

  private getPairKey(baseToken: TokenInfo, quoteToken: TokenInfo): string {
    return `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`;
  }
}
