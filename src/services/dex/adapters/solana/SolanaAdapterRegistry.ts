
import { DexAdapter, DexConfig } from '../../types';
import { JupiterAdapter } from '../JupiterAdapter';
import { OrcaAdapter } from '../OrcaAdapter';
import { RaydiumAdapter } from '../RaydiumAdapter';

/**
 * Manages and provides Solana chain DEX adapters
 */
export class SolanaAdapterRegistry {
  private adapters: Map<string, DexAdapter> = new Map();
  
  constructor(dexConfigs: DexConfig[]) {
    this.initializeAdapters(dexConfigs);
  }

  /**
   * Initialize all Solana chain DEX adapters
   */
  private initializeAdapters(dexConfigs: DexConfig[]): void {
    const getConfigBySlug = (slug: string): DexConfig => {
      const config = dexConfigs.find(c => c.slug === slug);
      if (!config) {
        throw new Error(`DEX configuration not found for: ${slug}`);
      }
      return config;
    };
    
    this.adapters.set('jupiter', new JupiterAdapter(getConfigBySlug('jupiter')));
    this.adapters.set('orca', new OrcaAdapter(getConfigBySlug('orca')));
    this.adapters.set('raydium', new RaydiumAdapter(getConfigBySlug('raydium')));
  }

  /**
   * Get all supported chain IDs (for Solana, just returns [101])
   */
  public getSupportedChains(): number[] {
    return [101]; // Solana mainnet chain ID
  }

  /**
   * Get all adapters for Solana (chainId 101)
   */
  public getAdapters(): DexAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.isEnabled());
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
