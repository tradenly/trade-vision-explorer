
export function getDexFee(dexName: string): number {
  const fees: Record<string, number> = {
    'uniswap': 0.003,
    'sushiswap': 0.003,
    'pancakeswap': 0.0025,
    'jupiter': 0.0035,
    'orca': 0.003,
    'raydium': 0.003,
    'balancer': 0.002,
    'curve': 0.0004
  };

  return fees[dexName.toLowerCase()] || 0.003;
}

export function getGasEstimate(chainId: number, dexName: string): number {
  const chainGasBase: Record<number, number> = {
    1: 0.005,
    56: 0.0005,
    137: 0.001,
    101: 0.00001
  };

  const dexMultipliers: Record<string, number> = {
    'uniswap': 1.0,
    'sushiswap': 1.1,
    'curve': 0.8,
    'balancer': 1.2,
    'jupiter': 1.0,
    'orca': 1.0,
    'raydium': 1.0,
    'pancakeswap': 0.9
  };

  const baseGas = chainGasBase[chainId] || 0.003;
  const multiplier = dexMultipliers[dexName.toLowerCase()] || 1.0;

  return baseGas * multiplier;
}

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

export function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
