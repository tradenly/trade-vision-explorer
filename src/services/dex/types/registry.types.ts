
import { DexAdapter, DexConfig } from '../types';

export interface DexRegistryConfig {
  name: string;
  slug: string;
  chainIds: number[];
  tradingFeePercentage: number;
  enabled: boolean;
}

export interface DexRegistryInterface {
  getAdaptersForChain(chainId: number): DexAdapter[];
  getAllDexConfigs(): DexConfig[];
  updateDexConfig(slug: string, enabled: boolean): void;
  getDexesForNetwork(networkName: string): DexAdapter[];
}
