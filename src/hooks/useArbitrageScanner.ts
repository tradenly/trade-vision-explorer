import { useState, useEffect, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { fetchAndStorePriceData } from '@/services/priceDataCollection';
import { findArbitrageOpportunities } from '@/services/arbitrageDetection';

export function useArbitrageScanner(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  minProfitPercentage: number = 0.5,
  autoScan: boolean = false
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Please select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First update price data
      await fetchAndStorePriceData(baseToken, quoteToken);
      
      // Then find opportunities
      const results = await findArbitrageOpportunities(
        baseToken,
        quoteToken,
        minProfitPercentage
      );

      setOpportunities(results);
      setLastScanTime(new Date());
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, minProfitPercentage]);

  // Set up auto-scan if enabled
  useEffect(() => {
    if (!autoScan || !baseToken || !quoteToken) return;

    scanForOpportunities();
    const interval = setInterval(scanForOpportunities, 30000); // Scan every 30 seconds

    return () => clearInterval(interval);
  }, [autoScan, baseToken, quoteToken, scanForOpportunities]);

  return {
    opportunities,
    loading,
    error,
    scanForOpportunities,
    lastScanTime
  };
}
