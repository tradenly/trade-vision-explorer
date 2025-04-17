import { DexAdapter, DexConfig, PriceQuote } from './types';
import { supabase } from '@/lib/supabaseClient';
import { UniswapAdapter } from './adapters/UniswapAdapter';
import { SushiswapAdapter } from './adapters/SushiswapAdapter';
import { PancakeSwapAdapter } from './adapters/PancakeSwapAdapter';
import { CurveAdapter } from './adapters/CurveAdapter';
import { BalancerAdapter } from './adapters/BalancerAdapter';
import { JupiterAdapter } from './adapters/JupiterAdapter';
import { OrcaAdapter } from './adapters/OrcaAdapter';
import { RaydiumAdapter } from './adapters/RaydiumAdapter';
import { TokenInfo } from '@/services/tokenListService';

/**
 * Registry for all supported DEXs
 * This is the central place to add/remove DEXs
 */
class DexRegistry {
  private static instance: DexRegistry;
  private adapters: Map<string, DexAdapter> = new Map();
  private dexConfigs: DexConfig[] = [
    { name: 'Uniswap', slug: 'uniswap', chainIds: [1, 42161, 8453, 10], tradingFeePercentage: 0.3, enabled: true },
    { name: 'SushiSwap', slug: 'sushiswap', chainIds: [1, 137, 42161, 8453], tradingFeePercentage: 0.3, enabled: true },
    { name: 'Balancer', slug: 'balancer', chainIds: [1, 137, 42161, 10], tradingFeePercentage: 0.2, enabled: true },
    { name: 'Curve', slug: 'curve', chainIds: [1, 137, 42161, 10], tradingFeePercentage: 0.04, enabled: true },
    { name: 'PancakeSwap', slug: 'pancakeswap', chainIds: [56, 1, 8453], tradingFeePercentage: 0.25, enabled: true },
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
      const { data, error } = await supabase
        .from('dex_settings')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const dexConfig of data) {
          const adapter = this.adapters.get(dexConfig.slug);
          if (adapter) {
            adapter.setEnabled(dexConfig.enabled);
            const existingConfig = this.dexConfigs.find(c => c.slug === dexConfig.slug);
            if (existingConfig && dexConfig.chain_ids) {
              existingConfig.chainIds = dexConfig.chain_ids;
            }
          }
        }
      } else {
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

      const { error } = await supabase
        .from('dex_settings')
        .upsert(configsToSave, { onConflict: 'slug' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving DEX config to Supabase:', error);
    }
  }

  private initializeAdapters() {
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
    let adapters: DexAdapter[] = [];
    
    this.adapters.forEach(adapter => {
      if (adapter.getSupportedChains().includes(chainId) && adapter.isEnabled()) {
        adapters.push(adapter);
      }
    });
    
    if (chainId === 101) {
      adapters = adapters.filter(adapter => 
        ['Jupiter', 'Orca', 'Raydium'].includes(adapter.getName())
      );
    } else {
      adapters = adapters.filter(adapter => 
        !['Jupiter', 'Orca', 'Raydium'].includes(adapter.getName())
      );
    }
    
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
  
  public getDexesForNetwork(networkName: string): DexAdapter[] {
    const networkToChainId: Record<string, number> = {
      'ethereum': 1,
      'bnb': 56,
      'solana': 101,
      'polygon': 137,
      'arbitrum': 42161,
      'optimism': 10,
      'base': 8453
    };
    
    const chainId = networkToChainId[networkName.toLowerCase()];
    if (!chainId) {
      console.warn(`Unknown network: ${networkName}, defaulting to Ethereum`);
      return this.getAdaptersForChain(1);
    }
    
    return this.getAdaptersForChain(chainId);
  }

  public async fetchLatestPricesForPair(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, PriceQuote>> {
    try {
      const adapters = this.getAdaptersForChain(baseToken.chainId);
      const results: Record<string, PriceQuote> = {};
      
      const promises = adapters.map(async (adapter) => {
        try {
          const quote = await adapter.fetchQuote(baseToken, quoteToken);
          if (quote) {
            results[adapter.getName()] = quote;
          }
        } catch (error) {
          console.error(`Error fetching price from ${adapter.getName()}:`, error);
        }
      });
      
      await Promise.all(promises);
      
      await this.storePriceData(baseToken, quoteToken, results);
      
      return results;
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return {};
    }
  }
  
  private async storePriceData(baseToken: TokenInfo, quoteToken: TokenInfo, prices: Record<string, PriceQuote>): Promise<void> {
    const pricesToStore = Object.entries(prices).map(([dexName, quote]) => ({
      dex_name: dexName,
      token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      chain_id: baseToken.chainId,
      price: quote.price,
      timestamp: new Date().toISOString()
    }));
    
    if (pricesToStore.length > 0) {
      const { error } = await supabase
        .from('dex_price_history')
        .insert(pricesToStore);
      
      if (error) {
        console.error('Failed to store price data:', error);
      }
    }
  }

  public async checkDexApiStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        if (adapter.isEnabled()) {
          status[name] = true;
        } else {
          status[name] = false;
        }
      } catch (error) {
        console.error(`Error checking status of ${name}:`, error);
        status[name] = false;
      }
    }
    
    return status;
  }
}

export default DexRegistry;
