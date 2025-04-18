
import { TokenInfo } from '@/services/tokenListService';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';
import { FeeService } from '@/services/dex/services/FeeService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { PriceCalculationService } from '@/services/arbitrage/PriceCalculationService';
import { ArbitrageProfitService } from '@/services/arbitrage/ArbitrageProfitService';

export function simulateArbitrageTrade(
  opportunity: ArbitrageOpportunity,
  newAmount: number,
  priceImpactService: PriceImpactService,
  feeService: FeeService
): ArbitrageOpportunity {
  if (!opportunity) return opportunity;
  
  const priceCalculationService = PriceCalculationService.getInstance();
  const profitService = ArbitrageProfitService.getInstance();
  
  // Calculate slippage and price impact with new amount
  const slippageInfo = priceCalculationService.calculateSlippageAdjustedPrices(
    opportunity.buyPrice,
    opportunity.sellPrice,
    opportunity.liquidity,
    opportunity.liquidity,
    newAmount
  );
  
  // Calculate fees
  const tradingFees = feeService.calculateTradingFees(newAmount, opportunity.buyDex, opportunity.sellDex);
  const platformFee = feeService.calculatePlatformFee(newAmount);
  
  // Calculate net profit
  const netProfitInfo = profitService.calculateNetProfit(
    slippageInfo.adjustedBuyPrice,
    slippageInfo.adjustedSellPrice,
    newAmount,
    tradingFees,
    platformFee,
    opportunity.gasFee
  );
  
  // Calculate tokens bought and gross proceeds
  const totalTokensBought = newAmount / slippageInfo.adjustedBuyPrice;
  const grossProceeds = totalTokensBought * slippageInfo.adjustedSellPrice;
  const estimatedProfit = grossProceeds - newAmount;
  
  return {
    ...opportunity,
    investmentAmount: newAmount,
    estimatedProfit,
    netProfit: netProfitInfo.netProfit,
    netProfitPercentage: netProfitInfo.netProfitPercentage,
    tradingFees,
    platformFee,
    buyPriceImpact: slippageInfo.buyPriceImpact,
    sellPriceImpact: slippageInfo.sellPriceImpact,
    adjustedBuyPrice: slippageInfo.adjustedBuyPrice,
    adjustedSellPrice: slippageInfo.adjustedSellPrice
  };
}
