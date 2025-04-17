
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
      // First update price data
      await fetchAndStorePriceData(baseToken, quoteToken);
      
      // Then find opportunities
      const results = await findArbitrageOpportunities(
        baseToken,
        quoteToken,
        minProfitPercentage,
        investmentAmount
      );

      setOpportunities(results);
      setLastScanTime(new Date());
      resetErrors();

      // Show success toast if opportunities found
      if (results.length > 0) {
        toast({
          title: "Arbitrage Opportunities Found",
          description: `Found ${results.length} potential trades.`,
        });
      }
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      setOpportunities([]);
      
      // Increment consecutive errors
      setConsecutiveErrors(prev => prev + 1);
      
      // Show error toast
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : 'Failed to scan for opportunities',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, minProfitPercentage, investmentAmount, toast, resetErrors]);

  // Set up auto-scan with exponential backoff on errors
  useEffect(() => {
    if (!autoScan || !baseToken || !quoteToken) return;

    let intervalId: NodeJS.Timeout;
    
    const startScanning = () => {
      // Calculate delay based on consecutive errors (exponential backoff)
      const baseDelay = 30000; // 30 seconds base interval
      const errorBackoff = consecutiveErrors > 0 
        ? Math.min(Math.pow(2, consecutiveErrors) * 1000, 300000) // Max 5 minutes
        : 0;
      
      const delay = baseDelay + errorBackoff;

      intervalId = setInterval(scanForOpportunities, delay);
      
      // Initial scan
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
