
import { PriceResult } from '../types.ts';

export class PriceValidation {
  /**
   * Validate that a price quote is reasonable
   */
  static validateQuote(quote: { dexName: string; price: number; liquidityUSD?: number; timestamp: number }): boolean {
    // Price should be positive
    if (quote.price <= 0) {
      console.warn(`Invalid price: ${quote.price} from ${quote.dexName}`);
      return false;
    }
    
    // Price should not be absurdly high
    if (quote.price > 1e10) {
      console.warn(`Suspiciously high price: ${quote.price} from ${quote.dexName}`);
      return false;
    }
    
    // Check for reasonable liquidity
    if (quote.liquidityUSD && quote.liquidityUSD < 100) {
      console.warn(`Very low liquidity: $${quote.liquidityUSD} from ${quote.dexName}`);
      return false;
    }
    
    // Check for stale data
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (now - quote.timestamp > maxAge) {
      console.warn(`Stale price data from ${quote.dexName}, age: ${(now - quote.timestamp) / 1000} seconds`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate that prices across sources are consistent
   */
  static validatePriceConsistency(quotes: PriceResult[]): boolean {
    if (quotes.length <= 1) {
      return true; // Not enough quotes to compare
    }
    
    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Check if any price deviates by more than 15% from the average
    const maxDeviation = 0.15;
    
    for (let i = 0; i < prices.length; i++) {
      const deviation = Math.abs(prices[i] - avgPrice) / avgPrice;
      
      if (deviation > maxDeviation) {
        console.warn(`Price inconsistency detected: ${quotes[i].source} price ${prices[i]} deviates from avg ${avgPrice} by ${deviation * 100}%`);
        return false;
      }
    }
    
    return true;
  }
}
