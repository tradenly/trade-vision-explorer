
/**
 * Utility class to handle rate limiting for API calls
 */
export class RateLimiter {
  private requestTimes: number[] = [];
  private readonly limitPerSecond: number;
  private readonly windowMs: number;

  constructor(limitPerSecond: number, windowMs: number = 1000) {
    this.limitPerSecond = limitPerSecond;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.windowMs);

    if (this.requestTimes.length >= this.limitPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestTimes.push(now);
  }
}

// Create instances for different DEXs
export const uniswapRateLimiter = new RateLimiter(5);  // 5 requests per second
export const jupiterRateLimiter = new RateLimiter(10); // 10 requests per second
export const orcaRateLimiter = new RateLimiter(5);     // 5 requests per second
export const raydiumRateLimiter = new RateLimiter(5);  // 5 requests per second
