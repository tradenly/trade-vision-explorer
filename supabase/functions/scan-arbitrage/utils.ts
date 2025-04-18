
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

export function estimateGasFee(chainId: number): number {
  const gasFees: Record<number, number> = {
    1: 0.005,
    56: 0.0005,
    137: 0.001,
    42161: 0.002,
    10: 0.001,
    8453: 0.001,
    101: 0.00001
  };
  return gasFees[chainId] || 0.003;
}

export function calculateTradingFees(investmentAmount: number, dex1: string, dex2: string): number {
  const feeRates: Record<string, number> = {
    uniswap: 0.003,
    sushiswap: 0.003,
    pancakeswap: 0.0025,
    jupiter: 0.0035,
    orca: 0.003,
    raydium: 0.003,
    balancer: 0.002,
    curve: 0.0004
  };
  
  const dex1Fee = feeRates[dex1.toLowerCase()] || 0.003;
  const dex2Fee = feeRates[dex2.toLowerCase()] || 0.003;
  
  return investmentAmount * (dex1Fee + dex2Fee);
}

export function calculatePlatformFee(investmentAmount: number): number {
  const platformFeeRate = 0.005;
  return investmentAmount * platformFeeRate;
}

export function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
