
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
  // Calculate trading fees more precisely based on DEX-specific rates
  const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
  
  // Platform fee (Tradenly's service fee)
  const platformFee = calculatePlatformFee(investmentAmount);
  
  // Get estimated gas fees for the chain
  const gasFee = estimateGasFee(chainId);
  
  // Split gas fee estimates for buy and sell operations
  const buyGasFee = gasFee * 0.6;  // Buy operations typically use more gas (~60%)
  const sellGasFee = gasFee * 0.4;  // Sell operations (~40%)
  
  // Calculate gross profit (before fees)
  const estimatedProfit = investmentAmount * (sellPrice - buyPrice) / buyPrice;
  
  // Calculate net profit after all fees
  const netProfit = estimatedProfit - tradingFees - platformFee - buyGasFee - sellGasFee;
  
  // Calculate net profit percentage relative to investment
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
