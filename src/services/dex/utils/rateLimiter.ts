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

// Export a singleton instance for Jupiter with a more production-ready rate limit
export const jupiterRateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

// Export a singleton instance for Orca
export const orcaRateLimiter = new RateLimiter(30); // 30 requests per minute

// Export a singleton instance for Raydium
export const raydiumRateLimiter = new RateLimiter(30); // 30 requests per minute

// Add additional rate limiters for other protocols as needed
export const uniswapRateLimiter = new RateLimiter(100); // 100 requests per minute
export const sushiswapRateLimiter = new RateLimiter(80); // 80 requests per minute
export const pancakeSwapRateLimiter = new RateLimiter(80); // 80 requests per minute
export const balancerRateLimiter = new RateLimiter(60); // 60 requests per minute
export const curveRateLimiter = new RateLimiter(60); // 60 requests per minute

// Track when the last error occurred for each provider to implement exponential backoff
export const errorTracker = {
  jupiter: { lastErrorTime: 0, consecutiveErrors: 0 },
  orca: { lastErrorTime: 0, consecutiveErrors: 0 },
  raydium: { lastErrorTime: 0, consecutiveErrors: 0 },
  uniswap: { lastErrorTime: 0, consecutiveErrors: 0 },
  sushiswap: { lastErrorTime: 0, consecutiveErrors: 0 },
  pancakeswap: { lastErrorTime: 0, consecutiveErrors: 0 },
  balancer: { lastErrorTime: 0, consecutiveErrors: 0 },
  curve: { lastErrorTime: 0, consecutiveErrors: 0 },
};

// Helper function to implement exponential backoff
export const applyBackoff = async (provider: keyof typeof errorTracker): Promise<void> => {
  const tracker = errorTracker[provider];
  
  // Reset if it's been a while since the last error
  const now = Date.now();
  if (now - tracker.lastErrorTime > 60000) { // Reset after 1 minute without errors
    tracker.consecutiveErrors = 0;
    return;
  }
  
  tracker.lastErrorTime = now;
  tracker.consecutiveErrors++;
  
  // Exponential backoff: 2^n * 100ms (capped at 30 seconds)
  const delayMs = Math.min(Math.pow(2, tracker.consecutiveErrors) * 100, 30000);
  
  console.log(`[BackoffSystem] ${provider} backing off for ${delayMs}ms after ${tracker.consecutiveErrors} consecutive errors`);
  
  // Wait for the backoff period
  await new Promise(resolve => setTimeout(resolve, delayMs));
};
