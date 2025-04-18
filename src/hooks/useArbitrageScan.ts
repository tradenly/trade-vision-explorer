
import { useState, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { ArbitrageOpportunityService } from '@/services/arbitrage/ArbitrageOpportunityService';
import { GasEstimationService } from '@/services/dex/services/GasEstimationService';

// Helper function to get network name from chainId
const getNetworkName = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 56:
      return 'binance';
    case 101:
      return 'solana';
    default:
      return 'ethereum';
  }
};

export interface ScanOptions {
  minProfitPercentage: number;
  maxSlippageTolerance: number;
  minLiquidity: number;
}

export function useArbitrageScan(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  options: ScanOptions,
  autoScan: boolean = false
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);

  const onChainPriceService = OnChainPriceService.getInstance();
  const arbitrageService = ArbitrageOpportunityService.getInstance();
  const gasService = GasEstimationService.getInstance();

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const priceQuotes = await onChainPriceService.getOnChainPrices(baseToken, quoteToken);
      
      if (Object.keys(priceQuotes).length < 2) {
        setError('Not enough price quotes available for arbitrage');
        setOpportunities([]);
        return;
      }
      
      setPrices(priceQuotes);
      
      const networkName = getNetworkName(baseToken.chainId);
      const gasEstimate = await gasService.getOperationGasEstimate(networkName, 'swap');
      const approvalGasEstimate = await gasService.getOperationGasEstimate(networkName, 'approval');
      
      const foundOpportunities = arbitrageService.findOpportunities(
        priceQuotes,
        baseToken,
        quoteToken,
        options.minProfitPercentage,
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
  }, [baseToken, quoteToken, options.minProfitPercentage, investmentAmount]);

  return {
    opportunities,
    prices,
    loading,
    error,
    lastScanned,
    scanForOpportunities
  };
}
