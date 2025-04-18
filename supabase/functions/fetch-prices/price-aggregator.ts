import { DexAdapter, PriceResult, TokenPair } from './types.ts';
import { UniswapAdapter } from './dex-adapters/uniswap.ts';
import { SushiswapAdapter } from './dex-adapters/sushiswap.ts';
import { PancakeSwapAdapter } from './dex-adapters/pancakeswap.ts';
import { JupiterAdapter } from './dex-adapters/jupiter.ts';
import { BalancerAdapter } from './dex-adapters/balancer.ts';
import { CurveAdapter } from './dex-adapters/curve.ts';
import { OrcaAdapter } from './dex-adapters/orca.ts';
import { RaydiumAdapter } from './dex-adapters/raydium.ts';
import { rateLimiter } from './utils/rate-limiter.ts';
import { PriceValidation } from './utils/price-validation.ts';

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
    this.adapters.push(new SushiswapAdapter());
    this.adapters.push(new PancakeSwapAdapter());
    
    // EVM specialized adapters
    this.adapters.push(new BalancerAdapter());
    this.adapters.push(new CurveAdapter());
    
    // Solana adapters
    this.adapters.push(new JupiterAdapter());
    this.adapters.push(new OrcaAdapter());
    this.adapters.push(new RaydiumAdapter());
  }

  async getPrices(pair: TokenPair): Promise<Record<string, PriceResult>> {
    const cacheKey = `${pair.baseToken.address}-${pair.quoteToken.address}-${pair.chainId}`;
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && (Date.now() - cachedResult.timestamp) < this.cacheDuration) {
      console.log('Returning cached price data');
      return { [cachedResult.data.source]: cachedResult.data };
    }

    const results: Record<string, PriceResult> = {};
    
    // Filter adapters based on chain ID
    const applicableAdapters = this.adapters.filter(adapter => {
      if (pair.chainId === 101) {
        // For Solana (chainId 101), use only Solana-compatible adapters
        return adapter instanceof JupiterAdapter || 
               adapter instanceof OrcaAdapter || 
               adapter instanceof RaydiumAdapter;
      } else {
        // For EVM chains, use EVM-compatible adapters
        return !(adapter instanceof JupiterAdapter || 
                adapter instanceof OrcaAdapter || 
                adapter instanceof RaydiumAdapter);
      }
    });

    // Use rate limiter to avoid hitting API rate limits
    await rateLimiter.waitForSlot();
    
    // Process adapters in parallel with proper error handling
    const pricePromises = applicableAdapters.map(async (adapter) => {
      try {
        const result = await adapter.getPrice(
          pair.baseToken.address,
          pair.quoteToken.address,
          pair.chainId
        );
        
        if (result) {
          // Validate the price quote
          const isValid = PriceValidation.validateQuote({
            dexName: adapter.getName(),
            price: result.price,
            liquidityUSD: result.liquidity,
            timestamp: result.timestamp
          });

          if (isValid) {
            results[result.source] = result;
            this.cache.set(cacheKey, {
              data: result,
              timestamp: Date.now()
            });
          } else {
            console.warn(`Invalid price quote from ${adapter.getName()}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching price from ${adapter.getName()}:`, error);
      }
    });

    await Promise.all(pricePromises);

    // Validate price consistency across sources
    const quotes = Object.values(results);
    const isConsistent = PriceValidation.validatePriceConsistency(quotes);

    if (!isConsistent) {
      console.warn('Price inconsistency detected across sources');
    }

    return results;
  }
}
