
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private rateLimit: number;
  private lastRequestTime = 0;

  constructor(requestsPerSecond: number = 1) {
    this.rateLimit = 1000 / requestsPerSecond;
  }

  public async waitForSlot(): Promise<void> {
    return new Promise<void>((resolve) => {
      // Add to queue
      this.queue.push(async () => {
        // Calculate time to wait
        const now = Date.now();
        const timeToWait = Math.max(0, this.lastRequestTime + this.rateLimit - now);
        
        if (timeToWait > 0) {
          await new Promise(r => setTimeout(r, timeToWait));
        }
        
        // Update last request time
        this.lastRequestTime = Date.now();
        
        // Resolve the original promise
        resolve();
      });
      
      // Process queue if not already processing
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Get next item and process
    const nextRequest = this.queue.shift();
    if (nextRequest) {
      await nextRequest();
    }
    
    // Process next item
    this.processQueue();
  }
}

// Create shared rate limiter
export const rateLimiter = new RateLimiter(2); // 2 requests per second
