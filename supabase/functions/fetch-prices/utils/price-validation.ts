
import { PriceResult } from '../types.ts';

export class PriceValidation {
  /**
   * Validates that a price quote is reasonable
   */
  static validateQuote(quote: { 
    dexName: string; 
    price: number; 
    liquidityUSD?: number;
    timestamp?: number;
  }): boolean {
    // Check for undefined or null price
    if (quote.price === undefined || quote.price === null) {
      return false;
    }
    
    // Check for positive price
    if (quote.price <= 0) {
      return false;
    }
    
    // Check for reasonable price range based on token
    // This is a simple check - expand as needed
    if (quote.dexName.includes('eth') && (quote.price < 500 || quote.price > 100000)) {
      return false;
    }
    
    if (quote.dexName.includes('sol') && (quote.price < 10 || quote.price > 10000)) {
      return false;
    }
    
    // Check for stale data (if timestamp provided)
    if (quote.timestamp) {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (now - quote.timestamp > maxAge) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validates price consistency across multiple sources
   */
  static validatePriceConsistency(quotes: PriceResult[]): boolean {
    if (quotes.length < 2) {
      return true; // Not enough sources to compare
    }
    
    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Check if any price deviates more than 10% from average
    return prices.every(price => {
      const deviation = Math.abs(price - avgPrice) / avgPrice;
      return deviation <= 0.10; // 10% tolerance
    });
  }
}
