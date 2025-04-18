
import { PriceResult } from '../types.ts';

/**
 * Utility class for validating price quotes from DEXes
 */
export class PriceValidation {
  /**
   * Validates a single price quote
   */
  static validateQuote(quote: Partial<PriceResult>): boolean {
    // Basic validation
    if (!quote.price || quote.price <= 0) return false;
    
    // Check for extreme price values
    if (quote.price > 1e10 || quote.price < 1e-10) return false;
    
    // Timestamp validation (not older than 5 minutes)
    if (quote.timestamp && Date.now() - quote.timestamp > 5 * 60 * 1000) return false;
    
    return true;
  }

  /**
   * Validates price consistency across multiple sources
   */
  static validatePriceConsistency(quotes: PriceResult[]): boolean {
    if (quotes.length < 2) return true;

    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Check if any price deviates more than 10% from average
    const maxDeviation = 0.1;
    return prices.every(price => 
      Math.abs(price - avgPrice) / avgPrice <= maxDeviation
    );
  }
}
