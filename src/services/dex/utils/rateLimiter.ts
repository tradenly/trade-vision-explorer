/**
 * Simple rate limiter for DEX API calls
 */
class RateLimiter {
  private lastRequestTime: number = 0;
  private requestsPerSecond: number;

  constructor(requestsPerSecond: number = 5) {
    this.requestsPerSecond = requestsPerSecond;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const minTimeBetweenRequests = 1000 / this.requestsPerSecond;
    const timeToWait = Math.max(0, minTimeBetweenRequests - (now - this.lastRequestTime));

    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }

    this.lastRequestTime = Date.now();
  }
}

// Create rate limiters for different DEXs
export const uniswapRateLimiter = new RateLimiter(3);  // 3 requests per second (TheGraph limit)
export const sushiswapRateLimiter = new RateLimiter(5); // 5 requests per second
export const jupiterRateLimiter = new RateLimiter(10);  // Jupiter allows more requests
export const orcaRateLimiter = new RateLimiter(5);
export const raydiumRateLimiter = new RateLimiter(5);
