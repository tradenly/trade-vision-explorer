
import { useState, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { supabase } from '@/lib/supabaseClient';
import { PriceQuote } from '@/services/dex/types';

export interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceDifferencePercentage: number;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  tokenPair: string;
  network: string;
  estimatedProfit: number;
  investmentAmount: number;
  timestamp: number;
  totalFees: number;
  netProfit: number;
  tradeFee: number;
  gasFee: number;
  platformFee: number;
}

export interface ScanOptions {
  minProfitPercentage: number;
  maxSlippageTolerance?: number;
  minLiquidity?: number;
}

export function useArbitrageScanner(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  scanOptions: ScanOptions = { minProfitPercentage: 0.5 },
  autoScan: boolean = false
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol}`);
      console.log('Investment amount:', investmentAmount);
      console.log('Min profit percentage:', scanOptions.minProfitPercentage);
      
      // Call the scan-arbitrage edge function
      const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
        body: { 
          baseToken, 
          quoteToken,
          minProfitPercentage: scanOptions.minProfitPercentage,
          investmentAmount 
        }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }
      
      // Save the prices and opportunities
      if (data.prices) {
        // Ensure the prices object uses string keys instead of number keys
        const formattedPrices: Record<string, PriceQuote> = {};
        Object.entries(data.prices).forEach(([key, value]) => {
          formattedPrices[key] = {
            price: (value as any).price,
            fees: (value as any).fees,
            gasEstimate: (value as any).gasEstimate,
            liquidityUSD: (value as any).liquidityUSD,
            timestamp: Date.now()
          };
        });
        setPrices(formattedPrices);
      }
      
      if (data.opportunities) {
        console.log(`Found ${data.opportunities.length} opportunities`);
        setOpportunities(data.opportunities);
      } else {
        console.log('No opportunities found');
        setOpportunities([]);
      }
      
      setLastScanTime(new Date());
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, investmentAmount, scanOptions.minProfitPercentage]);

  return {
    opportunities,
    prices,
    loading,
    error,
    lastScanTime,
    scanForOpportunities
  };
}
