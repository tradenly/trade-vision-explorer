
import { DexAdapter, DexConfig } from './types';
import { supabase } from '@/lib/supabaseClient';
import { UniswapAdapter } from './adapters/UniswapAdapter';
import { SushiswapAdapter } from './adapters/SushiswapAdapter';
import { PancakeSwapAdapter } from './adapters/PancakeSwapAdapter';
import { CurveAdapter } from './adapters/CurveAdapter';
import { BalancerAdapter } from './adapters/BalancerAdapter';
import { JupiterAdapter } from './adapters/JupiterAdapter';
import { OrcaAdapter } from './adapters/OrcaAdapter';
import { RaydiumAdapter } from './adapters/RaydiumAdapter';

/**
 * Registry for all supported DEXs
 * This is the central place to add/remove DEXs
 */
class DexRegistry {
  private static instance: DexRegistry;
  private adapters: Map<string, DexAdapter> = new Map();
  private dexConfigs: DexConfig[] = [
    { name: 'Uniswap', slug: 'uniswap', chainIds: [1], tradingFeePercentage: 0.3, enabled: true },
    { name: 'SushiSwap', slug: 'sushiswap', chainIds: [1], tradingFeePercentage: 0.3, enabled: true },
    { name: 'Balancer', slug: 'balancer', chainIds: [1], tradingFeePercentage: 0.2, enabled: true },
    { name: 'Curve', slug: 'curve', chainIds: [1], tradingFeePercentage: 0.04, enabled: true },
    { name: 'PancakeSwap', slug: 'pancakeswap', chainIds: [56], tradingFeePercentage: 0.25, enabled: true },
    { name: 'Jupiter', slug: 'jupiter', chainIds: [101], tradingFeePercentage: 0.2, enabled: true },
    { name: 'Orca', slug: 'orca', chainIds: [101], tradingFeePercentage: 0.25, enabled: true },
    { name: 'Raydium', slug: 'raydium', chainIds: [101], tradingFeePercentage: 0.25, enabled: true }
  ];
  
  private constructor() {
    this.initializeAdapters();
    this.loadConfigFromSupabase();
  }

  public static getInstance(): DexRegistry {
    if (!DexRegistry.instance) {
      DexRegistry.instance = new DexRegistry();
    }
    return DexRegistry.instance;
  }

  private async loadConfigFromSupabase() {
    try {
      // Try to load DEX configuration from Supabase
      const { data, error } = await supabase
        .from('dex_settings')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Update local configs with those from Supabase
        for (const dexConfig of data) {
          const adapter = this.adapters.get(dexConfig.slug);
          if (adapter) {
            adapter.setEnabled(dexConfig.enabled);
          }
        }
      } else {
        // If no settings exist, create them in Supabase
        await this.saveConfigToSupabase();
      }
    } catch (error) {
      console.error('Error loading DEX config from Supabase:', error);
    }
  }

  public async saveConfigToSupabase() {
    try {
      const configsToSave = this.dexConfigs.map(config => {
        const adapter = this.adapters.get(config.slug);
        return {
          name: config.name,
          slug: config.slug,
          chain_ids: config.chainIds,
          trading_fee_percentage: config.tradingFeePercentage,
          enabled: adapter ? adapter.isEnabled() : config.enabled
        };
      });

      // Upsert the configs to Supabase
      const { error } = await supabase
        .from('dex_settings')
        .upsert(configsToSave, { onConflict: 'slug' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving DEX config to Supabase:', error);
    }
  }

  private initializeAdapters() {
    // Initialize all adapters
    this.adapters.set('uniswap', new UniswapAdapter(this.getConfigBySlug('uniswap')));
    this.adapters.set('sushiswap', new SushiswapAdapter(this.getConfigBySlug('sushiswap')));
    this.adapters.set('balancer', new BalancerAdapter(this.getConfigBySlug('balancer')));
    this.adapters.set('curve', new CurveAdapter(this.getConfigBySlug('curve')));
    this.adapters.set('pancakeswap', new PancakeSwapAdapter(this.getConfigBySlug('pancakeswap')));
    this.adapters.set('jupiter', new JupiterAdapter(this.getConfigBySlug('jupiter')));
    this.adapters.set('orca', new OrcaAdapter(this.getConfigBySlug('orca')));
    this.adapters.set('raydium', new RaydiumAdapter(this.getConfigBySlug('raydium')));
  }

  private getConfigBySlug(slug: string): DexConfig {
    const config = this.dexConfigs.find(c => c.slug === slug);
    if (!config) {
      throw new Error(`DEX configuration not found for: ${slug}`);
    }
    return config;
  }

  public getAdaptersForChain(chainId: number): DexAdapter[] {
    const adapters: DexAdapter[] = [];
    this.adapters.forEach(adapter => {
      if (adapter.getSupportedChains().includes(chainId) && adapter.isEnabled()) {
        adapters.push(adapter);
      }
    });
    return adapters;
  }

  public getAllDexConfigs(): DexConfig[] {
    return this.dexConfigs.map(config => {
      const adapter = this.adapters.get(config.slug);
      return {
        ...config,
        enabled: adapter ? adapter.isEnabled() : config.enabled
      };
    });
  }

  public updateDexConfig(slug: string, enabled: boolean): void {
    const adapter = this.adapters.get(slug);
    if (adapter) {
      adapter.setEnabled(enabled);
      this.saveConfigToSupabase();
    }
  }
}

export default DexRegistry;
