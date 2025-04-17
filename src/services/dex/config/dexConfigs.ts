
import { DexConfig } from '../types';

export const defaultDexConfigs: DexConfig[] = [
  { name: 'Uniswap', slug: 'uniswap', chainIds: [1, 42161, 8453, 10], tradingFeePercentage: 0.3, enabled: true },
  { name: 'SushiSwap', slug: 'sushiswap', chainIds: [1, 137, 42161, 8453], tradingFeePercentage: 0.3, enabled: true },
  { name: 'Balancer', slug: 'balancer', chainIds: [1, 137, 42161, 10], tradingFeePercentage: 0.2, enabled: true },
  { name: 'Curve', slug: 'curve', chainIds: [1, 137, 42161, 10], tradingFeePercentage: 0.04, enabled: true },
  { name: 'PancakeSwap', slug: 'pancakeswap', chainIds: [56, 1, 8453], tradingFeePercentage: 0.25, enabled: true },
  { name: 'Jupiter', slug: 'jupiter', chainIds: [101], tradingFeePercentage: 0.2, enabled: true },
  { name: 'Orca', slug: 'orca', chainIds: [101], tradingFeePercentage: 0.25, enabled: true },
  { name: 'Raydium', slug: 'raydium', chainIds: [101], tradingFeePercentage: 0.25, enabled: true }
];

export const networkToChainId: Record<string, number> = {
  'ethereum': 1,
  'bnb': 56,
  'solana': 101,
  'polygon': 137,
  'arbitrum': 42161,
  'optimism': 10,
  'base': 8453
};
