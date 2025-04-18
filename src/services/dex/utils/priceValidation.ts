
import { PriceQuote } from '../types';

export class PriceValidation {
  /**
   * Validates a price quote for reasonableness
   */
  static validateQuote(quote: PriceQuote): boolean {
    // Basic validation
    if (!quote.price || quote.price <= 0) return false;
    if (!quote.liquidityUSD || quote.liquidityUSD <= 0) return false;
    
    // Check for extreme price values
    if (quote.price > 1e10 || quote.price < 1e-10) return false;
    
    // Timestamp validation (not older than 5 minutes)
    if (quote.timestamp && Date.now() - quote.timestamp > 5 * 60 * 1000) return false;
    
    return true;
  }

  /**
   * Validates price consistency across multiple sources
   */
  static validatePriceConsistency(quotes: PriceQuote[]): boolean {
    if (quotes.length < 2) return true;

    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Check if any price deviates more than 10% from average
    const maxDeviation = 0.1;
    return prices.every(price => 
      Math.abs(price - avgPrice) / avgPrice <= maxDeviation
    );
  }

  /**
   * Checks if there's enough liquidity for a trade
   */
  static validateLiquidity(quote: PriceQuote, tradeAmount: number): boolean {
    // Require 3x liquidity coverage for safety
    const requiredLiquidity = tradeAmount * 3;
    return quote.liquidityUSD >= requiredLiquidity;
  }
}
