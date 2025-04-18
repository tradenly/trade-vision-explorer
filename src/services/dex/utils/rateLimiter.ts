
/**
 * Utility class to handle rate limiting for API calls
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly limitPerSecond: number;
  private readonly windowMs: number;
  private consecutiveFailures: number = 0;
  private backoffTime: number = 0;
  private lastFailureTime: number = 0;

  constructor(limitPerSecond: number, windowMs: number = 1000) {
    this.limitPerSecond = limitPerSecond;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.windowMs);

    // Apply exponential backoff if necessary
    if (this.backoffTime > 0 && now - this.lastFailureTime < this.backoffTime) {
      const waitTime = this.backoffTime - (now - this.lastFailureTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    if (this.requestTimes.length >= this.limitPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestTimes.push(now);
  }

  /**
   * Record a successful API call to reset backoff time
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.backoffTime = 0;
  }

  /**
   * Record a failed API call to trigger exponential backoff
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    
    // Exponential backoff: 2^failures * 100ms, max 30 seconds
    this.backoffTime = Math.min(Math.pow(2, this.consecutiveFailures) * 100, 30000);
  }
}

// Create instances for different DEXs
export const uniswapRateLimiter = new RateLimiter(5);  // 5 requests per second
export const jupiterRateLimiter = new RateLimiter(10); // 10 requests per second
export const orcaRateLimiter = new RateLimiter(5);     // 5 requests per second
export const raydiumRateLimiter = new RateLimiter(5);  // 5 requests per second
export const sushiswapRateLimiter = new RateLimiter(5); // 5 requests per second for SushiSwap
