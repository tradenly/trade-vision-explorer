
import { useState, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { ArbitrageOpportunityService } from '@/services/arbitrage/ArbitrageOpportunityService';
import { GasEstimationService } from '@/services/dex/services/GasEstimationService';
import { getNetworkName } from '@/services/arbitrage/utils';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export interface ScanOptions {
  minProfitPercentage: number;
  maxSlippageTolerance?: number;
  minLiquidity?: number;
  refreshInterval?: number;
}

export function useArbitrageScan(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  options: ScanOptions = { minProfitPercentage: 0.5 },
  autoScan: boolean = false
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const onChainPriceService = OnChainPriceService.getInstance();
  const arbitrageService = ArbitrageOpportunityService.getInstance();
  const gasService = GasEstimationService.getInstance();
  
  // Function to scan using the Edge Function
  const scanWithEdgeFunction = async () => {
    try {
      if (!baseToken || !quoteToken) {
        throw new Error('Select both base and quote tokens');
      }
      
      console.log(`Scanning for arbitrage via Edge Function: ${baseToken.symbol}/${quoteToken.symbol}`);
      
      const { data, error: functionError } = await supabase.functions.invoke('scan-arbitrage', {
        body: { 
          baseToken, 
          quoteToken, 
          minProfitPercentage: options.minProfitPercentage,
          investmentAmount,
          maxAgeSeconds: 60 // Use prices from last 60 seconds
        }
      });
      
      if (functionError) {
        throw new Error(`Edge function error: ${functionError.message}`);
      }
      
      if (!data || !data.opportunities) {
        throw new Error('No data returned from Edge Function');
      }
      
      console.log(`Found ${data.opportunities.length} opportunities via Edge Function`);
      
      // Filter out opportunities that don't meet our criteria
      const filteredOpportunities = data.opportunities.filter((opp: ArbitrageOpportunity) => {
        return (
          opp.netProfitPercentage >= options.minProfitPercentage &&
          (!options.minLiquidity || opp.liquidity >= options.minLiquidity)
        );
      });
      
      setOpportunities(filteredOpportunities);
      setLastScanTime(new Date());
      
      if (filteredOpportunities.length > 0) {
        toast({
          title: "Arbitrage Found",
          description: `Found ${filteredOpportunities.length} arbitrage opportunities`,
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error scanning with Edge Function:', err);
      throw err;
    }
  };
  
  // Fallback to client-side scanning if Edge Function fails
  const scanWithClientSide = async () => {
    try {
      if (!baseToken || !quoteToken) {
        throw new Error('Select both base and quote tokens');
      }
      
      console.log(`Scanning for arbitrage on client: ${baseToken.symbol}/${quoteToken.symbol}`);
      
      const priceQuotes = await onChainPriceService.getOnChainPrices(baseToken, quoteToken);
      
      if (Object.keys(priceQuotes).length < 2) {
        throw new Error('Not enough price quotes available for arbitrage (need at least 2 DEXes)');
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
      
      // Filter based on additional criteria
      const filteredOpportunities = foundOpportunities.filter(opp => {
        return (!options.minLiquidity || opp.liquidity >= options.minLiquidity);
      });
      
      setOpportunities(filteredOpportunities);
      setLastScanTime(new Date());
      
      if (filteredOpportunities.length > 0) {
        toast({
          title: "Arbitrage Found",
          description: `Found ${filteredOpportunities.length} arbitrage opportunities`,
        });
      }
      
      return true;
    } catch (err) {
      console.error('Error scanning with client-side:', err);
      throw err;
    }
  };

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try edge function first, fall back to client-side
      let success = false;
      
      try {
        success = await scanWithEdgeFunction();
      } catch (edgeError) {
        console.warn('Edge function scan failed, falling back to client-side:', edgeError);
      }
      
      if (!success) {
        await scanWithClientSide();
      }
      
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      
      // Show error toast
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, options.minProfitPercentage, options.minLiquidity, investmentAmount]);

  // Set up auto-scanning if enabled
  useState(() => {
    if (!autoScan || !baseToken || !quoteToken) return;
    
    const interval = setInterval(() => {
      scanForOpportunities();
    }, options.refreshInterval || 30000); // Default to 30 seconds
    
    return () => clearInterval(interval);
  }, [autoScan, baseToken, quoteToken, options.refreshInterval, scanForOpportunities]);

  return {
    opportunities,
    prices,
    loading,
    error,
    lastScanTime,
    scanForOpportunities
  };
}
