/**
 * Enhanced rate limiter for DEX API calls with backoff strategy
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private requestsPerSecond: number;
  private consecutiveFailures: number = 0;
  private maxBackoffMs: number = 30000; // 30 seconds maximum backoff

  constructor(requestsPerSecond: number = 5) {
    this.requestsPerSecond = requestsPerSecond;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const minTimeBetweenRequests = 1000 / this.requestsPerSecond;
    
    // Calculate backoff based on consecutive failures
    const backoffMs = this.consecutiveFailures > 0 
      ? Math.min(Math.pow(2, this.consecutiveFailures) * 1000, this.maxBackoffMs)
      : 0;
    
    const timeToWait = Math.max(0, minTimeBetweenRequests - (now - this.lastRequestTime) + backoffMs);

    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    this.lastRequestTime = Date.now();
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
  }

  public async isThrottled(): Promise<boolean> {
    return this.consecutiveFailures >= 5;
  }

  public getBackoffTime(): number {
    if (this.consecutiveFailures === 0) return 0;
    return Math.min(Math.pow(2, this.consecutiveFailures) * 1000, this.maxBackoffMs);
  }

  public getStatus(): { isThrottled: boolean; backoffTime: number } {
    return {
      isThrottled: this.consecutiveFailures >= 5,
      backoffTime: this.getBackoffTime()
    };
  }
}

// Create rate limiters for different DEXs with appropriate limits
export const uniswapRateLimiter = new RateLimiter(5);  // 5 requests per second
export const sushiswapRateLimiter = new RateLimiter(3); // 3 requests per second
export const jupiterRateLimiter = new RateLimiter(10);  // Jupiter allows more requests
export const orcaRateLimiter = new RateLimiter(5);
export const raydiumRateLimiter = new RateLimiter(5);
export const pancakeswapRateLimiter = new RateLimiter(3);
export const balancerRateLimiter = new RateLimiter(3);
export const curveRateLimiter = new RateLimiter(2);    // More conservative rate for Curve
