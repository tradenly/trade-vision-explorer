import { DexAdapter, DexConfig, PriceQuote } from './types';
import { TokenInfo } from '@/services/tokenListService';
import { defaultDexConfigs, networkToChainId } from './config/dexConfigs';
import { DexPersistenceService } from './services/dexPersistenceService';
import { EVMAdapterRegistry } from './adapters/evm/EVMAdapterRegistry';
import { SolanaAdapterRegistry } from './adapters/solana/SolanaAdapterRegistry';
import { PriceService } from './services/PriceService';

class DexRegistry {
  private static instance: DexRegistry;
  private dexConfigs: DexConfig[] = defaultDexConfigs;
  private persistenceService: DexPersistenceService;
  private priceService: PriceService;
  private registries: Map<number, DexAdapter[]> = new Map();
  
  private constructor() {
    this.persistenceService = new DexPersistenceService();
    this.priceService = new PriceService(this);
    this.initializeRegistries();
    this.loadConfigFromSupabase();
  }

  private initializeRegistries() {
    const evmRegistry = new EVMAdapterRegistry(this.dexConfigs);
    const solanaRegistry = new SolanaAdapterRegistry(this.dexConfigs);

    evmRegistry.getSupportedChains().forEach(chainId => {
      this.registries.set(chainId, evmRegistry.getAdaptersForChain(chainId));
    });

    solanaRegistry.getSupportedChains().forEach(chainId => {
      this.registries.set(chainId, solanaRegistry.getAdapters());
    });
  }

  public static getInstance(): DexRegistry {
    if (!DexRegistry.instance) {
      DexRegistry.instance = new DexRegistry();
    }
    return DexRegistry.instance;
  }

  public getAdaptersForChain(chainId: number): DexAdapter[] {
    return this.registries.get(chainId) || [];
  }

  public async fetchLatestPricesForPair(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, PriceQuote>> {
    return this.priceService.fetchLatestPricesForPair(baseToken, quoteToken);
  }

  private async loadConfigFromSupabase() {
    try {
      const data = await this.persistenceService.loadConfigFromSupabase();
      
      if (data.length > 0) {
        for (const dexConfig of data) {
          const evmAdapter = this.evmRegistry.getAdapter(dexConfig.slug);
          if (evmAdapter) {
            evmAdapter.setEnabled(dexConfig.enabled);
            const existingConfig = this.dexConfigs.find(c => c.slug === dexConfig.slug);
            if (existingConfig && dexConfig.chainIds) {
              existingConfig.chainIds = dexConfig.chainIds;
            }
          }
          
          const solanaAdapter = this.solanaRegistry.getAdapter(dexConfig.slug);
          if (solanaAdapter) {
            solanaAdapter.setEnabled(dexConfig.enabled);
            const existingConfig = this.dexConfigs.find(c => c.slug === dexConfig.slug);
            if (existingConfig && dexConfig.chainIds) {
              existingConfig.chainIds = dexConfig.chainIds;
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

  public getAllDexConfigs(): DexConfig[] {
    return this.dexConfigs.map(config => {
      const evmAdapter = this.evmRegistry.getAdapter(config.slug);
      const solanaAdapter = this.solanaRegistry.getAdapter(config.slug);
      const adapter = evmAdapter || solanaAdapter;
      
      return {
        ...config,
        enabled: adapter ? adapter.isEnabled() : config.enabled
      };
    });
  }

  public updateDexConfig(slug: string, enabled: boolean): void {
    this.evmRegistry.updateAdapterEnabled(slug, enabled);
    this.solanaRegistry.updateAdapterEnabled(slug, enabled);
    
    this.persistenceService.saveConfigToSupabase(this.getAllDexConfigs());
  }
  
  public getDexesForNetwork(networkName: string): DexAdapter[] {    
    const chainId = networkToChainId[networkName.toLowerCase()];
    if (!chainId) {
      console.warn(`Unknown network: ${networkName}, defaulting to Ethereum`);
      return this.getAdaptersForChain(1);
    }
    
    return this.getAdaptersForChain(chainId);
  }

  public async checkDexApiStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    const evmAdapters = this.evmRegistry.getAllAdapters();
    for (const adapter of evmAdapters) {
      try {
        status[adapter.getSlug()] = adapter.isEnabled();
      } catch (error) {
        console.error(`Error checking status of ${adapter.getName()}:`, error);
        status[adapter.getSlug()] = false;
      }
    }
    
    const solanaAdapters = this.solanaRegistry.getAllAdapters();
    for (const adapter of solanaAdapters) {
      try {
        status[adapter.getSlug()] = adapter.isEnabled();
      } catch (error) {
        console.error(`Error checking status of ${adapter.getName()}:`, error);
        status[adapter.getSlug()] = false;
      }
    }
    
    return status;
  }

  private evmRegistry: EVMAdapterRegistry = new EVMAdapterRegistry(this.dexConfigs);
  private solanaRegistry: SolanaAdapterRegistry = new SolanaAdapterRegistry(this.dexConfigs);
}

export default DexRegistry;
