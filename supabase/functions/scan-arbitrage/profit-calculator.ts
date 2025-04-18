
import { TokenInfo } from './types.ts';
import { getDexTradingFee, calculatePlatformFee } from './utils.ts';

interface ProfitDetails {
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceGap: number;
  priceGapPercentage: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  tradingFees: number;
  networkFees: number;
  platformFee: number;
  totalFees: number;
  netProfit: number;
  netProfitPercentage: number;
  investmentAmount: number;
}

/**
 * Calculate detailed arbitrage profit information
 */
export function calculateArbitrageProfit(
  buyDex: string,
  sellDex: string,
  buyPrice: number,
  sellPrice: number,
  investmentAmount: number,
  chainId: number,
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  gasPrice: number = 0.001
): ProfitDetails {
  // Calculate the price gap
  const priceGap = sellPrice - buyPrice;
  const priceGapPercentage = (priceGap / buyPrice) * 100;
  
  // Calculate the amount of tokens that can be bought with the investment
  const tokenAmount = investmentAmount / buyPrice;
  
  // Calculate the sell value
  const sellValue = tokenAmount * sellPrice;
  
  // Calculate the raw profit (before fees)
  const rawProfit = sellValue - investmentAmount;
  const rawProfitPercentage = (rawProfit / investmentAmount) * 100;
  
  // Calculate fees
  const buyFeePercentage = getDexTradingFee(buyDex);
  const sellFeePercentage = getDexTradingFee(sellDex);
  
  const buyTradingFee = investmentAmount * buyFeePercentage;
  const sellTradingFee = sellValue * sellFeePercentage;
  
  // Calculate network fees (gas)
  // For Solana, adjust since gas is much cheaper
  let networkFees = gasPrice * 2; // Two transactions (buy and sell)
  
  // Extra logic for Solana specific gas calculation
  if (chainId === 101) {
    const priorityFeeInLamports = 10000; // Priority fee in lamports
    const signaturesRequired = 2; // Typically 2 for a swap
    const baseFeeInLamports = 5000 * signaturesRequired; // Base fee per signature
    const totalLamports = baseFeeInLamports + priorityFeeInLamports;
    const solInUsd = 150; // Estimated SOL price in USD
    
    // Convert lamports to SOL to USD (1 SOL = 1e9 lamports)
    networkFees = (totalLamports / 1e9) * solInUsd;
  }
  
  // Calculate platform fee
  const platformFee = calculatePlatformFee(investmentAmount);
  
  // Total fees
  const totalFees = buyTradingFee + sellTradingFee + networkFees + platformFee;
  
  // Net profit after fees
  const netProfit = rawProfit - totalFees;
  const netProfitPercentage = (netProfit / investmentAmount) * 100;
  
  return {
    buyDex,
    sellDex,
    buyPrice,
    sellPrice,
    priceGap,
    priceGapPercentage,
    estimatedProfit: rawProfit,
    estimatedProfitPercentage: rawProfitPercentage,
    tradingFees: buyTradingFee + sellTradingFee,
    networkFees,
    platformFee,
    totalFees,
    netProfit,
    netProfitPercentage,
    investmentAmount
  };
}
