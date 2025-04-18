import { useState, useEffect, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { fetchAndStorePriceData, findArbitrageOpportunities } from '@/services/priceDataCollection';
import { useToast } from '@/hooks/use-toast';

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
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const { toast } = useToast();

  const resetErrors = useCallback(() => {
    setConsecutiveErrors(0);
    setError(null);
  }, []);

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Please select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await scanArbitrageOpportunities(
        baseToken,
        quoteToken,
        minProfitPercentage,
        investmentAmount
      );

      if (result.errors.length > 0) {
        setError(result.errors.join(', '));
      }

      setOpportunities(result.opportunities);
      setLastScanTime(new Date());
      resetErrors();

      if (result.opportunities.length > 0) {
        toast({
          title: "Arbitrage Opportunities Found",
          description: `Found ${result.opportunities.length} potential trades.`,
        });
      }
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      setOpportunities([]);
      setConsecutiveErrors(prev => prev + 1);
      
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : 'Failed to scan for opportunities',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, minProfitPercentage, investmentAmount, toast, resetErrors]);

  useEffect(() => {
    if (!autoScan || !baseToken || !quoteToken) return;

    let intervalId: NodeJS.Timeout;
    
    const startScanning = () => {
      const baseDelay = 30000; // 30 seconds base interval
      const errorBackoff = consecutiveErrors > 0 
        ? Math.min(Math.pow(2, consecutiveErrors) * 1000, 300000) // Max 5 minutes
        : 0;
      
      const delay = baseDelay + errorBackoff;

      intervalId = setInterval(scanForOpportunities, delay);
      
      scanForOpportunities();
    };

    startScanning();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoScan, baseToken, quoteToken, consecutiveErrors, scanForOpportunities]);

  return {
    opportunities,
    loading,
    error,
    scanForOpportunities,
    lastScanTime,
    consecutiveErrors
  };
}
