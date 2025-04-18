
import { TokenInfo } from '@/services/tokenListService';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';
import { FeeService } from '@/services/dex/services/FeeService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';

export function simulateArbitrageTrade(
  opportunity: ArbitrageOpportunity,
  newAmount: number,
  priceImpactService: PriceImpactService,
  feeService: FeeService
): ArbitrageOpportunity {
  if (!opportunity) return opportunity;
  
  // Calculate slippage and price impact with new amount
  const slippageInfo = priceImpactService.calculateSlippageAdjustedPrices(
    opportunity.buyPrice,
    opportunity.sellPrice,
    opportunity.liquidity,
    opportunity.liquidity,
    newAmount
  );
  
  // Calculate fees
  const tradingFees = feeService.calculateTradingFees(newAmount, opportunity.buyDex, opportunity.sellDex);
  const platformFee = feeService.calculatePlatformFee(newAmount);
  
  // Calculate profits
  const totalTokensBought = newAmount / slippageInfo.adjustedBuyPrice;
  const grossProceeds = totalTokensBought * slippageInfo.adjustedSellPrice;
  const estimatedProfit = grossProceeds - newAmount;
  const netProfit = estimatedProfit - tradingFees - platformFee - opportunity.gasFee;
  
  return {
    ...opportunity,
    investmentAmount: newAmount,
    estimatedProfit,
    netProfit,
    netProfitPercentage: (netProfit / newAmount) * 100,
    tradingFees,
    platformFee,
    buyPriceImpact: slippageInfo.buyPriceImpact,
    sellPriceImpact: slippageInfo.sellPriceImpact,
    adjustedBuyPrice: slippageInfo.adjustedBuyPrice,
    adjustedSellPrice: slippageInfo.adjustedSellPrice
  };
}
