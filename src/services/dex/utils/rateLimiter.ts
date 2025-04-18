
/**
 * Simple rate limiter to prevent API flooding
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = false;
  private requestsPerSecond: number;
  private backoffTime: number = 1000; // 1s initial backoff
  private consecutiveFailures: number = 0;
  private maxBackoffTime: number = 60000; // 1 minute max backoff

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
  }

  public async waitForSlot(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Add to queue
      this.queue.push(resolve);
      
      // If not already processing queue, start
      if (!this.running) {
        this.processQueue();
      }
    });
  }
  
  public recordSuccess(): void {
    // Reset failures counter on success
    this.consecutiveFailures = 0;
    this.backoffTime = 1000; // Reset backoff time
  }
  
  public recordFailure(): void {
    // Increment failure counter
    this.consecutiveFailures++;
    // Exponential backoff (2^failures * base), capped at maximum
    this.backoffTime = Math.min(
      Math.pow(2, this.consecutiveFailures) * 1000, 
      this.maxBackoffTime
    );
    console.warn(`API request failed. Backing off for ${this.backoffTime}ms`);
  }

  private async processQueue(): Promise<void> {
    this.running = true;
    
    while (this.queue.length > 0) {
      // Apply exponential backoff if there have been failures
      if (this.consecutiveFailures > 0) {
        await new Promise(resolve => setTimeout(resolve, this.backoffTime));
      }
      
      // Process one item
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
      
      // Wait according to rate limit
      await new Promise(resolve => setTimeout(resolve, 1000 / this.requestsPerSecond));
    }
    
    this.running = false;
  }
}

// Create instances for different DEXes
export const uniswapRateLimiter = new RateLimiter(10); // 10 requests per second
export const sushiswapRateLimiter = new RateLimiter(8); // 8 requests per second
export const pancakeswapRateLimiter = new RateLimiter(10); // 10 requests per second
export const jupiterRateLimiter = new RateLimiter(6); // 6 requests per second
export const orcaRateLimiter = new RateLimiter(5); // 5 requests per second
export const raydiumRateLimiter = new RateLimiter(5); // 5 requests per second
export const balancerRateLimiter = new RateLimiter(8); // 8 requests per second
export const curveRateLimiter = new RateLimiter(8); // 8 requests per second
