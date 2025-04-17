
export class RateLimiter {
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  
  constructor(
    private maxRequests: number,
    private timeWindowMs: number = 60000 // 1 minute default
  ) {}

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Reset counter if time window has passed
    if (now - this.lastResetTime >= this.timeWindowMs) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Check if we're over the limit
    if (this.requestCount >= this.maxRequests) {
      return false;
    }
    
    // Increment counter and allow request
    this.requestCount++;
    return true;
  }
  
  async waitForSlot(): Promise<void> {
    while (!(await this.checkLimit())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Export a singleton instance for Jupiter
export const jupiterRateLimiter = new RateLimiter(50); // 50 requests per minute

// Export a singleton instance for Orca
export const orcaRateLimiter = new RateLimiter(30); // 30 requests per minute

// Export a singleton instance for Raydium
export const raydiumRateLimiter = new RateLimiter(30); // 30 requests per minute
