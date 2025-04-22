
import { useState, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { ArbitrageOpportunityService } from '@/services/arbitrage/ArbitrageOpportunityService';
import { GasEstimationService } from '@/services/dex/services/GasEstimationService';
import { getNetworkName } from '@/services/arbitrage/utils';
import { PriceQuote } from '@/services/dex/types';

export function useArbitrageScanner(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
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

  return {
    opportunities,
    prices,
    loading,
    error,
    lastScanned,
    scanForOpportunities
  };
}
