
import { DexAdapter, DexConfig } from '../../types';
import { UniswapAdapter } from '../UniswapAdapter';
import { SushiswapAdapter } from '../SushiswapAdapter';
import { PancakeSwapAdapter } from '../PancakeSwapAdapter';
import { CurveAdapter } from '../CurveAdapter';
import { BalancerAdapter } from '../BalancerAdapter';

/**
 * Manages and provides EVM chain DEX adapters
 */
export class EVMAdapterRegistry {
  private adapters: Map<string, DexAdapter> = new Map();
  
  constructor(dexConfigs: DexConfig[]) {
    this.initializeAdapters(dexConfigs);
  }

  /**
   * Initialize all EVM chain DEX adapters
   */
  private initializeAdapters(dexConfigs: DexConfig[]): void {
    const getConfigBySlug = (slug: string): DexConfig => {
      const config = dexConfigs.find(c => c.slug === slug);
      if (!config) {
        throw new Error(`DEX configuration not found for: ${slug}`);
      }
      return config;
    };

    this.adapters.set('uniswap', new UniswapAdapter(getConfigBySlug('uniswap')));
    this.adapters.set('sushiswap', new SushiswapAdapter(getConfigBySlug('sushiswap')));
    this.adapters.set('balancer', new BalancerAdapter(getConfigBySlug('balancer')));
    this.adapters.set('curve', new CurveAdapter(getConfigBySlug('curve')));
    this.adapters.set('pancakeswap', new PancakeSwapAdapter(getConfigBySlug('pancakeswap')));
  }

  /**
   * Get all adapters for a specific EVM chain
   */
  public getAdaptersForChain(chainId: number): DexAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => 
        adapter.getSupportedChains().includes(chainId) && 
        adapter.isEnabled()
      );
  }

  /**
   * Get a specific adapter by slug
   */
  public getAdapter(slug: string): DexAdapter | undefined {
    return this.adapters.get(slug);
  }

  /**
   * Get all registered adapters
   */
  public getAllAdapters(): DexAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Update adapter enabled state
   */
  public updateAdapterEnabled(slug: string, enabled: boolean): void {
    const adapter = this.adapters.get(slug);
    if (adapter) {
      adapter.setEnabled(enabled);
    }
  }
}
