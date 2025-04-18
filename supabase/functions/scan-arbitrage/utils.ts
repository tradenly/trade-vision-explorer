
import { PriceData } from './types.ts';

/**
 * Gets network name from chain ID
 */
export function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    56: 'bnb',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism', 
    8453: 'base',
    101: 'solana'
  };
  return networks[chainId] || 'unknown';
}

/**
 * Calculate trading fees based on DEX-specific rates
 */
export function calculateTradingFees(
  investmentAmount: number,
  buyDex: string,
  sellDex: string
): number {
  const dexFees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    'balancer': 0.002, // 0.2%
    'curve': 0.0004 // 0.04%
  };

  // Get the fee rates for each DEX or use default
  const buyFeeRate = dexFees[buyDex.toLowerCase()] || 0.003;
  const sellFeeRate = dexFees[sellDex.toLowerCase()] || 0.003;
  
  // Calculate fees
  const buyFee = investmentAmount * buyFeeRate;
  const sellFee = investmentAmount * sellFeeRate;
  
  return buyFee + sellFee;
}

/**
 * Calculate platform fee (Tradenly's service fee)
 */
export function calculatePlatformFee(investmentAmount: number): number {
  const platformFeeRate = 0.005; // 0.5%
  return investmentAmount * platformFeeRate;
}

/**
 * Estimate gas fee based on chain
 */
export function estimateGasFee(chainId: number): number {
  const gasFees: Record<number, number> = {
    1: 0.005, // Ethereum (~$5.00)
    56: 0.0005, // BSC (~$0.50)
    137: 0.001, // Polygon (~$1.00)
    42161: 0.0008, // Arbitrum (~$0.80)
    10: 0.0003, // Optimism (~$0.30)
    8453: 0.0004, // Base (~$0.40)
    101: 0.00001 // Solana (~$0.01)
  };
  
  return gasFees[chainId] || 0.002; // Default to $2.00 if chain not found
}

/**
 * Format number as USD currency string
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Calculate risk level based on profit percentage
 */
export function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
