
/**
 * Utility for rate limiting API calls to prevent throttling
 */

// Rate limiter for different DEX APIs
export const jupiterRateLimiter = createRateLimiter(50, 60000); // 50 req/min
export const orcaRateLimiter = createRateLimiter(30, 60000); // 30 req/min
export const raydiumRateLimiter = createRateLimiter(30, 60000); // 30 req/min
export const uniswapRateLimiter = createRateLimiter(100, 60000); // 100 req/min
export const sushiswapRateLimiter = createRateLimiter(80, 60000); // 80 req/min
export const pancakeswapRateLimiter = createRateLimiter(60, 60000); // 60 req/min
export const balancerRateLimiter = createRateLimiter(40, 60000); // 40 req/min
export const curveRateLimiter = createRateLimiter(40, 60000); // 40 req/min

// Track consecutive errors for backoff strategy
export const errorTracker: Record<string, { consecutiveErrors: number, lastErrorTime: number }> = {
  jupiter: { consecutiveErrors: 0, lastErrorTime: 0 },
  orca: { consecutiveErrors: 0, lastErrorTime: 0 },
  raydium: { consecutiveErrors: 0, lastErrorTime: 0 },
  uniswap: { consecutiveErrors: 0, lastErrorTime: 0 },
  sushiswap: { consecutiveErrors: 0, lastErrorTime: 0 },
  pancakeswap: { consecutiveErrors: 0, lastErrorTime: 0 },
  balancer: { consecutiveErrors: 0, lastErrorTime: 0 },
  curve: { consecutiveErrors: 0, lastErrorTime: 0 }
};

/**
 * Creates a rate limiter that manages request timing to stay within API limits
 */
function createRateLimiter(requestsPerMinute: number, windowMs: number) {
  const queue: Array<() => void> = [];
  const requestTimestamps: number[] = [];
  let processingQueue = false;

  const removeOldTimestamps = () => {
    const now = Date.now();
    const timeWindow = now - windowMs;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < timeWindow) {
      requestTimestamps.shift();
    }
  };

  const processQueue = () => {
    if (processingQueue || queue.length === 0) return;
    
    processingQueue = true;
    removeOldTimestamps();

    if (requestTimestamps.length < requestsPerMinute) {
      const resolve = queue.shift();
      if (resolve) {
        requestTimestamps.push(Date.now());
        resolve();
      }
    }

    const timeUntilNextSlot = requestTimestamps.length >= requestsPerMinute 
      ? (requestTimestamps[0] + windowMs) - Date.now() + 50 // Add 50ms buffer
      : 0;

    setTimeout(() => {
      processingQueue = false;
      processQueue();
    }, Math.max(timeUntilNextSlot, 0));
  };

  return {
    waitForSlot: (): Promise<void> => {
      return new Promise(resolve => {
        queue.push(resolve);
        processQueue();
      });
    }
  };
}

/**
 * Apply exponential backoff based on consecutive error count
 */
export async function applyBackoff(dexName: keyof typeof errorTracker): Promise<void> {
  const tracker = errorTracker[dexName];
  if (!tracker) return;
  
  if (tracker.consecutiveErrors > 0) {
    const backoffTime = Math.min(2 ** tracker.consecutiveErrors * 1000, 60000); // Max 1 minute
    const timeElapsed = Date.now() - tracker.lastErrorTime;
    
    if (timeElapsed < backoffTime) {
      // Wait for the remaining backoff time
      await new Promise(resolve => setTimeout(resolve, backoffTime - timeElapsed));
    }
  }
}
