
import { supabase } from '@/lib/supabaseClient';

/**
 * Get trading fee for a specific DEX
 */
export function getDexFee(dexName: string): number {
  const fees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    'balancer': 0.002, // 0.2%
    'curve': 0.0004 // 0.04%
  };

  return fees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
}

/**
 * Estimate gas cost based on chain and DEX
 */
export function getGasEstimate(chainId: number, dexName: string): number {
  // Base gas estimates by chain
  const chainGasBase: Record<number, number> = {
    1: 0.005, // Ethereum
    56: 0.0005, // BSC
    137: 0.001, // Polygon
    101: 0.00001 // Solana
  };

  // Multipliers by DEX (relative to base)
  const dexMultipliers: Record<string, number> = {
    'uniswap': 1.0,
    'sushiswap': 1.1,
    'curve': 0.8, // More gas efficient
    'balancer': 1.2,
    'jupiter': 1.0,
    'orca': 1.0,
    'raydium': 1.0,
    'pancakeswap': 0.9 // Slightly more efficient on BSC
  };

  const baseGas = chainGasBase[chainId] || 0.003;
  const multiplier = dexMultipliers[dexName.toLowerCase()] || 1.0;

  return baseGas * multiplier;
}

/**
 * Calculate trading fees for a trade on multiple DEXes
 */
export function calculateTradingFees(amount: number, buyDex: string, sellDex: string): number {
  const buyFeeRate = getDexFee(buyDex);
  const sellFeeRate = getDexFee(sellDex);
  
  // Buy fee is applied to input amount
  const buyFee = amount * buyFeeRate;
  
  // Sell fee is applied to (amount - buyFee)
  const sellFee = (amount - buyFee) * sellFeeRate;
  
  return buyFee + sellFee;
}

/**
 * Calculate platform fee (Tradenly's fee)
 */
export function calculatePlatformFee(amount: number): number {
  const platformFeePercentage = 0.5; // 0.5%
  return (platformFeePercentage / 100) * amount;
}

/**
 * Estimate gas fee based on network
 */
export function estimateGasFee(chainId: number): number {
  // Default gas costs in USD
  const gasEstimates: Record<number, number> = {
    1: 5.0, // Ethereum
    56: 0.2, // BSC
    137: 0.1, // Polygon
    101: 0.00025, // Solana
    42161: 0.3, // Arbitrum
    10: 0.2, // Optimism
    8453: 0.1 // Base
  };
  
  return gasEstimates[chainId] || 1.0; // Default to $1 if unknown
}

/**
 * Get network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    56: 'bnb',
    137: 'polygon',
    101: 'solana',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base'
  };
  
  return networks[chainId] || 'ethereum';
}

/**
 * Get chain ID from network name
 */
export function getChainId(network: string): number {
  const chains: Record<string, number> = {
    'ethereum': 1,
    'bnb': 56,
    'polygon': 137,
    'solana': 101,
    'arbitrum': 42161,
    'optimism': 10,
    'base': 8453
  };
  
  return chains[network.toLowerCase()] || 1;
}

/**
 * Get latest gas price for a network
 */
export async function getLatestGasPrice(network: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('gas_fees')
      .select('*')
      .eq('network', network.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].base_fee;
    }
    
    return 0;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    return 0;
  }
}
