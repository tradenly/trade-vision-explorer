
import { DexAdapter, PriceResult, TokenPair } from './types.ts';
import { UniswapAdapter } from './dex-adapters/uniswap.ts';

export class PriceAggregator {
  private adapters: DexAdapter[] = [];
  private cache = new Map<string, {
    data: PriceResult;
    timestamp: number;
  }>();
  private cacheDuration = 30000; // 30 seconds

  constructor() {
    // Initialize DEX adapters
    this.adapters.push(new UniswapAdapter());
    // Add more adapters as needed
  }

  async getPrices(pair: TokenPair): Promise<Record<string, PriceResult>> {
    const cacheKey = `${pair.baseToken.address}-${pair.quoteToken.address}-${pair.chainId}`;
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < this.cacheDuration) {
      console.log('Returning cached price data');
      return { [cachedResult.data.source]: cachedResult.data };
    }

    const results: Record<string, PriceResult> = {};
    
    await Promise.all(
      this.adapters.map(async (adapter) => {
        try {
          const result = await adapter.getPrice(
            pair.baseToken.address,
            pair.quoteToken.address,
            pair.chainId
          );
          
          if (result) {
            results[result.source] = result;
            this.cache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('Error fetching price from adapter:', error);
        }
      })
    );

    return results;
  }
}
