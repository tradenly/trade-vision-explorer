
import { DexAdapter, DexConfig, PriceQuote } from './types';
import { TokenInfo } from '@/services/tokenListService';
import { UniswapAdapter } from './adapters/UniswapAdapter';
import { SushiswapAdapter } from './adapters/SushiswapAdapter';
import { PancakeSwapAdapter } from './adapters/PancakeSwapAdapter';
import { CurveAdapter } from './adapters/CurveAdapter';
import { BalancerAdapter } from './adapters/BalancerAdapter';
import { JupiterAdapter } from './adapters/JupiterAdapter';
import { OrcaAdapter } from './adapters/OrcaAdapter';
import { RaydiumAdapter } from './adapters/RaydiumAdapter';
import { defaultDexConfigs, networkToChainId } from './config/dexConfigs';
import { DexPersistenceService } from './services/dexPersistenceService';

class DexRegistry {
  private static instance: DexRegistry;
  private adapters: Map<string, DexAdapter> = new Map();
  private dexConfigs: DexConfig[] = defaultDexConfigs;
  private persistenceService: DexPersistenceService;
  
  private constructor() {
    this.persistenceService = new DexPersistenceService();
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
      const data = await this.persistenceService.loadConfigFromSupabase();
      
      if (data.length > 0) {
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
        await this.persistenceService.saveConfigToSupabase(this.dexConfigs);
      }
    } catch (error) {
      console.error('Error loading DEX config from Supabase:', error);
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
    let adapters = Array.from(this.adapters.values())
      .filter(adapter => 
        adapter.getSupportedChains().includes(chainId) && 
        adapter.isEnabled()
      );
    
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
      this.persistenceService.saveConfigToSupabase(this.getAllDexConfigs());
    }
  }
  
  public getDexesForNetwork(networkName: string): DexAdapter[] {    
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
      
      await this.persistenceService.storePriceData(baseToken, quoteToken, results);
      
      return results;
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      return {};
    }
  }

  public async checkDexApiStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        status[name] = adapter.isEnabled();
      } catch (error) {
        console.error(`Error checking status of ${name}:`, error);
        status[name] = false;
      }
    }
    
    return status;
  }
}

export default DexRegistry;
