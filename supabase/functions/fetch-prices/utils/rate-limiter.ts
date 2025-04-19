
/**
 * Simple rate limiter for API calls
 */
class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private interval: number;

  constructor(requestsPerSecond = 2) {
    this.interval = 1000 / requestsPerSecond;
  }

  async waitForSlot(): Promise<void> {
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Process first item in queue
    const next = this.queue.shift();
    if (next) next();
    
    // Wait for rate limit interval
    await new Promise(resolve => setTimeout(resolve, this.interval));
    
    this.processing = false;
    this.processQueue();
  }
}

export const rateLimiter = new RateLimiter(3); // 3 requests per second
