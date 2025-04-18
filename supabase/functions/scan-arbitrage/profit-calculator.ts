
import { calculateTradingFees, calculatePlatformFee, estimateGasFee } from './utils.ts';
import { ArbitrageOpportunity } from './types.ts';

export function calculateArbitrageProfit(
  buyDex: string,
  sellDex: string,
  buyPrice: number,
  sellPrice: number,
  investmentAmount: number,
  chainId: number,
  baseToken: any,
  quoteToken: any
): Omit<ArbitrageOpportunity, 'id' | 'tokenPair' | 'token' | 'network'> {
  const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
  const platformFee = calculatePlatformFee(investmentAmount);
  const gasFee = estimateGasFee(chainId);
  
  const buyGasFee = gasFee * 0.6;
  const sellGasFee = gasFee * 0.4;
  
  const estimatedProfit = investmentAmount * (sellPrice - buyPrice) / buyPrice;
  const netProfit = estimatedProfit - tradingFees - platformFee - buyGasFee - sellGasFee;
  const netProfitPercentage = (netProfit / investmentAmount) * 100;
  
  return {
    buyDex,
    sellDex,
    buyPrice,
    sellPrice,
    priceDifferencePercentage: ((sellPrice - buyPrice) / buyPrice) * 100,
    liquidity: 0, // This will be set by the caller
    estimatedProfit,
    estimatedProfitPercentage: ((sellPrice - buyPrice) / buyPrice) * 100,
    gasFee,
    netProfit,
    netProfitPercentage,
    baseToken,
    quoteToken,
    timestamp: Date.now(),
    buyGasFee,
    sellGasFee,
    tradingFees,
    platformFee,
    investmentAmount
  };
}
