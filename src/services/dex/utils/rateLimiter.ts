
/**
 * Utility for rate limiting API calls to prevent throttling
 */

// Configure rate limits per DEX
export const DEX_RATE_LIMITS = {
  jupiter: { requestsPerMinute: 50, windowMs: 60000 },
  orca: { requestsPerMinute: 30, windowMs: 60000 },
  raydium: { requestsPerMinute: 30, windowMs: 60000 },
  uniswap: { requestsPerMinute: 100, windowMs: 60000 },
  sushiswap: { requestsPerMinute: 80, windowMs: 60000 },
  pancakeswap: { requestsPerMinute: 60, windowMs: 60000 },
  balancer: { requestsPerMinute: 40, windowMs: 60000 },
  curve: { requestsPerMinute: 40, windowMs: 60000 }
} as const;

// Create rate limiters for each DEX
export const jupiterRateLimiter = createRateLimiter(DEX_RATE_LIMITS.jupiter);
export const orcaRateLimiter = createRateLimiter(DEX_RATE_LIMITS.orca);
export const raydiumRateLimiter = createRateLimiter(DEX_RATE_LIMITS.raydium);
export const uniswapRateLimiter = createRateLimiter(DEX_RATE_LIMITS.uniswap);
export const sushiswapRateLimiter = createRateLimiter(DEX_RATE_LIMITS.sushiswap);
export const pancakeswapRateLimiter = createRateLimiter(DEX_RATE_LIMITS.pancakeswap);
export const balancerRateLimiter = createRateLimiter(DEX_RATE_LIMITS.balancer);
export const curveRateLimiter = createRateLimiter(DEX_RATE_LIMITS.curve);

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
function createRateLimiter(config: { requestsPerMinute: number, windowMs: number }) {
  const queue: Array<() => void> = [];
  const requestTimestamps: number[] = [];
  let processingQueue = false;

  const removeOldTimestamps = () => {
    const now = Date.now();
    const timeWindow = now - config.windowMs;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < timeWindow) {
      requestTimestamps.shift();
    }
  };

  const processQueue = () => {
    if (processingQueue || queue.length === 0) return;
    
    processingQueue = true;
    removeOldTimestamps();

    if (requestTimestamps.length < config.requestsPerMinute) {
      const resolve = queue.shift();
      if (resolve) {
        requestTimestamps.push(Date.now());
        resolve();
      }
    }

    const timeUntilNextSlot = requestTimestamps.length >= config.requestsPerMinute 
      ? (requestTimestamps[0] + config.windowMs) - Date.now() + 50 // Add 50ms buffer
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

/**
 * Reset consecutive errors for a DEX when a successful request is made
 */
export function resetErrorCount(dexName: keyof typeof errorTracker): void {
  if (errorTracker[dexName]) {
    errorTracker[dexName].consecutiveErrors = 0;
  }
}

/**
 * Increment consecutive errors for a DEX when a request fails
 */
export function incrementErrorCount(dexName: keyof typeof errorTracker): void {
  if (errorTracker[dexName]) {
    errorTracker[dexName].consecutiveErrors++;
    errorTracker[dexName].lastErrorTime = Date.now();
  }
}
