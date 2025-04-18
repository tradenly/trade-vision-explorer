
/**
 * Get the human-readable network name based on chain ID
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 56:
      return 'binance';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 43114:
      return 'avalanche';
    case 8453:
      return 'base';
    case 101:
      return 'solana';
    default:
      return 'unknown';
  }
}

/**
 * Get the trading fee percentage for a DEX
 */
export function getDexTradingFee(dexName: string): number {
  const dexFees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'quickswap': 0.003, // 0.3%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    '1inch': 0.0025, // 0.25%
    'curve': 0.0004, // 0.04%
    'balancer': 0.002, // 0.2%
  };

  return dexFees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
}

/**
 * Calculate the platform fee for a trade
 */
export function calculatePlatformFee(investmentAmount: number): number {
  return investmentAmount * 0.001; // 0.1% platform fee
}
