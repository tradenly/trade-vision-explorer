
import { PriceResult } from '../types.ts';

/**
 * Utility class for validating price quotes from DEXes
 */
export class PriceValidation {
  /**
   * Validates a single price quote
   */
  static validateQuote(quote: Partial<PriceResult>): boolean {
    if (!quote.price || quote.price <= 0) {
      console.warn('Invalid price value:', quote.price);
      return false;
    }
    
    if (quote.price > 1e10 || quote.price < 1e-10) {
      console.warn('Price out of reasonable range:', quote.price);
      return false;
    }
    
    if (quote.timestamp && Date.now() - quote.timestamp > 5 * 60 * 1000) {
      console.warn('Price data too old:', new Date(quote.timestamp).toISOString());
      return false;
    }

    if (quote.liquidityUSD !== undefined && quote.liquidityUSD < 1000) {
      console.warn('Insufficient liquidity:', quote.liquidityUSD);
      return false;
    }
    
    return true;
  }

  /**
   * Validates price consistency across multiple sources
   */
  static validatePriceConsistency(quotes: PriceResult[]): boolean {
    if (quotes.length < 2) return true;

    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Calculate standard deviation
    const variance = prices.reduce((acc, price) => {
      const diff = price - avgPrice;
      return acc + (diff * diff);
    }, 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // If standard deviation is more than 5% of average price, consider prices inconsistent
    const maxDeviation = avgPrice * 0.05;
    
    if (stdDev > maxDeviation) {
      console.warn('Price inconsistency detected:', {
        avgPrice,
        stdDev,
        maxDeviation,
        prices
      });
      return false;
    }
    
    return true;
  }
}
