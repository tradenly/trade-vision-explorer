
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { useArbitrageScan } from './arbitrage/useArbitrageScan';
import { simulateArbitrageTrade } from './arbitrage/utils/arbitrageCalculations';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';
import { FeeService } from '@/services/dex/services/FeeService';

export function useArbitrageData(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  minProfitPercentage: number = 0.5,
  refreshInterval: number = 30000
) {
  const {
    opportunities,
    prices,
    loading,
    error,
    lastScanned,
    scanForOpportunities
  } = useArbitrageScan(baseToken, quoteToken, minProfitPercentage, investmentAmount);

  const priceImpactService = PriceImpactService.getInstance();
  const feeService = FeeService.getInstance();

  const simulateTrade = (opportunity: ArbitrageOpportunity, newAmount: number): ArbitrageOpportunity => {
    return simulateArbitrageTrade(opportunity, newAmount, priceImpactService, feeService);
  };

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
