
import { useState, useEffect, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { ArbitrageOpportunityService } from '@/services/arbitrage/ArbitrageOpportunityService';
import { FeeService } from '@/services/dex/services/FeeService';
import { GasEstimationService } from '@/services/dex/services/GasEstimationService';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';
import { getNetworkName } from '@/services/arbitrage/utils';

export function useArbitrageData(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  minProfitPercentage: number = 0.5,
  refreshInterval: number = 30000
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);

  // Services
  const onChainPriceService = OnChainPriceService.getInstance();
  const arbitrageService = ArbitrageOpportunityService.getInstance();
  const feeService = FeeService.getInstance();
  const gasService = GasEstimationService.getInstance();
  const priceImpactService = PriceImpactService.getInstance();

  /**
   * Scan for arbitrage opportunities
   */
  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get real-time on-chain prices
      const priceQuotes = await onChainPriceService.getOnChainPrices(baseToken, quoteToken);
      
      if (Object.keys(priceQuotes).length < 2) {
        setError('Not enough price quotes available for arbitrage');
        setOpportunities([]);
        setLoading(false);
        return;
      }
      
      setPrices(priceQuotes);
      
      // Get gas estimate for the network
      const networkName = getNetworkName(baseToken.chainId);
      const gasEstimate = await gasService.getOperationGasEstimate(networkName, 'swap');
      const approvalGasEstimate = await gasService.getOperationGasEstimate(networkName, 'approval');
      
      // Find arbitrage opportunities
      const foundOpportunities = arbitrageService.findOpportunities(
        priceQuotes,
        baseToken,
        quoteToken,
        minProfitPercentage,
        investmentAmount,
        networkName,
        gasEstimate,
        approvalGasEstimate
      );
      
      setOpportunities(foundOpportunities);
      setLastScanned(new Date());
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, minProfitPercentage, investmentAmount]);

  /**
   * Simulate trade with different investment amount
   */
  const simulateTrade = useCallback((
    opportunity: ArbitrageOpportunity,
    newAmount: number
  ): ArbitrageOpportunity => {
    if (!opportunity) return opportunity;
    
    // Calculate slippage and price impact with new amount
    const slippageInfo = priceImpactService.calculateSlippageAdjustedPrices(
      opportunity.buyPrice, 
      opportunity.sellPrice,
      opportunity.liquidity, // Use same liquidity
      opportunity.liquidity, // Use same liquidity
      newAmount
    );
    
    // Trading fees (DEX fees)
    const tradingFees = feeService.calculateTradingFees(
      newAmount, 
      opportunity.buyDex, 
      opportunity.sellDex
    );
    
    // Platform fee (Tradenly's fee)
    const platformFee = feeService.calculatePlatformFee(newAmount);
    
    // Calculate gross profit (before fees)
    const totalTokensBought = newAmount / slippageInfo.adjustedBuyPrice;
    const grossProceeds = totalTokensBought * slippageInfo.adjustedSellPrice;
    const estimatedProfit = grossProceeds - newAmount;
    
    // Calculate net profit after all fees
    const netProfit = estimatedProfit - tradingFees - platformFee - opportunity.gasFee;
    const netProfitPercentage = (netProfit / newAmount) * 100;
    
    // Return updated opportunity with new values
    return {
      ...opportunity,
      investmentAmount: newAmount,
      estimatedProfit,
      netProfit,
      netProfitPercentage,
      tradingFees,
      platformFee,
      buyPriceImpact: slippageInfo.buyPriceImpact,
      sellPriceImpact: slippageInfo.sellPriceImpact,
      adjustedBuyPrice: slippageInfo.adjustedBuyPrice,
      adjustedSellPrice: slippageInfo.adjustedSellPrice
    };
  }, [feeService, priceImpactService]);

  /**
   * Automatically refresh data at interval
   */
  useEffect(() => {
    if (!baseToken || !quoteToken || refreshInterval <= 0) return;
    
    // Scan immediately
    scanForOpportunities();
    
    // Set up refresh interval
    const intervalId = setInterval(scanForOpportunities, refreshInterval);
    
    // Clean up
    return () => clearInterval(intervalId);
  }, [baseToken, quoteToken, refreshInterval, scanForOpportunities]);

  return {
    opportunities,
    prices,
    loading,
    error,
    lastScanned,
    scanForOpportunities,
    simulateTrade
  };
}
