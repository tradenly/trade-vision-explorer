
/**
 * Simple rate limiter to prevent hitting API rate limits
 */
class RateLimiter {
  private queue: (() => void)[] = [];
  private processing = false;
  private requestsPerSecond: number;
  private lastRequestTime = 0;
  
  constructor(requestsPerSecond = 3) {
    this.requestsPerSecond = requestsPerSecond;
  }
  
  /**
   * Wait for a slot before making an API request
   */
  async waitForSlot(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Calculate time since last request
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;
    
    // If we need to wait to respect the rate limit
    if (elapsed < minInterval) {
      const delay = minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Process the next item in the queue
    const resolve = this.queue.shift();
    this.lastRequestTime = Date.now();
    
    if (resolve) {
      resolve();
    }
    
    this.processing = false;
    
    // Continue processing if there are more items
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }
}

export const rateLimiter = new RateLimiter(5); // 5 requests per second
