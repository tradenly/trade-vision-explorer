
/**
 * Price validation utilities
 */
export class PriceValidation {
  /**
   * Validate an individual price quote
   */
  static validateQuote({ 
    dexName,
    price,
    liquidityUSD,
    timestamp
  }: {
    dexName: string;
    price: number;
    liquidityUSD: number;
    timestamp: number;
  }): boolean {
    // Price should be positive
    if (price <= 0) {
      console.warn(`Invalid price from ${dexName}: ${price}`);
      return false;
    }
    
    // Timestamp should be recent
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - timestamp > maxAge) {
      console.warn(`Price from ${dexName} is too old: ${new Date(timestamp).toISOString()}`);
      return false;
    }
    
    // Liquidity should be adequate
    if (liquidityUSD < 10000) { // $10k minimum
      console.warn(`Liquidity from ${dexName} is too low: $${liquidityUSD}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate consistency across multiple price sources
   */
  static validatePriceConsistency(quotes: any[]): boolean {
    if (quotes.length < 2) return true;
    
    const prices = quotes.map(q => q.price);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Check if any price deviates more than 10% from average
    const maxDeviation = 0.10; // 10%
    
    for (let i = 0; i < prices.length; i++) {
      const deviation = Math.abs(prices[i] - avgPrice) / avgPrice;
      if (deviation > maxDeviation) {
        console.warn(`Price deviation detected: ${quotes[i].source} deviates ${(deviation * 100).toFixed(2)}% from average`);
        return false;
      }
    }
    
    return true;
  }
}
