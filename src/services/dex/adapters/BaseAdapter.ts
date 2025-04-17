
import { TokenInfo } from '@/services/tokenListService';
import { DexConfig, PriceQuote } from '../types';

export abstract class BaseAdapter {
  protected config: DexConfig;
  
  constructor(config: DexConfig) {
    this.config = config;
  }
  
  public getName(): string {
    return this.config.name;
  }
  
  public getSlug(): string {
    return this.config.slug;
  }
  
  public getSupportedChains(): number[] {
    return this.config.chainIds;
  }
  
  public isEnabled(): boolean {
    return this.config.enabled;
  }
  
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
  
  public getTradingFeePercentage(): number {
    return this.config.tradingFeePercentage;
  }
  
  public abstract fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount?: number): Promise<PriceQuote>;
  
  // Helper method to generate estimated price when API calls fail
  protected getEstimatedPrice(baseToken: TokenInfo, quoteToken: TokenInfo): number {
    // Simple price estimation based on token symbols for fallback scenarios
    const baseSymbol = baseToken.symbol.toUpperCase();
    const quoteSymbol = quoteToken.symbol.toUpperCase();
    
    // Predefined prices for common tokens
    const tokenPrices: Record<string, number> = {
      'ETH': 3500,
      'WETH': 3500,
      'BTC': 65000,
      'WBTC': 65000,
      'BNB': 550,
      'WBNB': 550,
      'SOL': 150,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'BUSD': 1,
      'MATIC': 1.2,
      'AVAX': 35,
      'LINK': 15,
      'UNI': 10,
      'AAVE': 95,
    };
    
    const basePrice = tokenPrices[baseSymbol] || 10;
    const quotePrice = tokenPrices[quoteSymbol] || 1;
    
    // Add a small random variation to simulate real-world fluctuations
    const randomFactor = 0.99 + Math.random() * 0.02; // between 0.99 and 1.01
    
    return (basePrice / quotePrice) * randomFactor;
  }
}
