
import { useState, useEffect, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { RealTimePriceMonitor } from '@/services/dex/services/RealTimePriceMonitor';
import { PriceService } from '@/services/dex/services/PriceService';
import DexRegistry from '@/services/dex/DexRegistry';
import { supabase } from '@/lib/supabaseClient';

export interface PriceImpactInfo {
  priceImpact: number;
  isHigh: boolean;
  slippageAdjustedPrice: number;
}

export function useRealTimePrices(baseToken: TokenInfo | null, quoteToken: TokenInfo | null) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [priceImpacts, setPriceImpacts] = useState<Record<string, PriceImpactInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate price impact based on investment amount and liquidity
  const calculatePriceImpact = useCallback((dexName: string, investmentAmount: number = 1000) => {
    if (!prices[dexName]) return null;
    
    const quote = prices[dexName];
    const liquidity = quote.liquidityUSD || investmentAmount * 100; // Default to 100x investment if no liquidity info
    
    // Simple price impact model: (investment / liquidity) * 100
    const impact = Math.min((investmentAmount / liquidity) * 100, 10); // Cap at 10%
    
    // Apply impact to price - default to true if isBuy is undefined
    const slippageAdjustedPrice = quote.isBuy !== false
      ? quote.price * (1 + impact / 100)  // Buy price increases with impact
      : quote.price * (1 - impact / 100); // Sell price decreases with impact
    
    return {
      priceImpact: impact,
      isHigh: impact > 3, // Consider anything over 3% as high impact
      slippageAdjustedPrice
    };
  }, [prices]);

  // Update price impacts when prices change
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      const impacts: Record<string, PriceImpactInfo> = {};
      
      Object.keys(prices).forEach(dexName => {
        const impact = calculatePriceImpact(dexName);
        if (impact) {
          impacts[dexName] = impact;
        }
      });
      
      setPriceImpacts(impacts);
    }
  }, [prices, calculatePriceImpact]);

  useEffect(() => {
    if (!baseToken || !quoteToken) return;

    setLoading(true);
    setError(null);

    const dexRegistry = DexRegistry.getInstance();
    const priceService = new PriceService(dexRegistry);
    const monitor = RealTimePriceMonitor.getInstance(priceService);

    // Generate pair key
    const pairKey = `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`;

    // Start monitoring this pair
    monitor.startMonitoring(baseToken, quoteToken);

    // Subscribe to real-time updates
    const channel = supabase.channel('price-updates')
      .on('broadcast', { event: 'price-update' }, (payload) => {
        if (payload.payload.pairKey === pairKey) {
          // Add timestamp to each price quote
          const quotesWithTimestamp = { ...payload.payload.quotes };
          Object.entries(quotesWithTimestamp).forEach(([key, quote]: [string, any]) => {
            quotesWithTimestamp[key] = {
              ...quote,
              timestamp: Date.now(),
              dexName: key
            };
          });
          
          setPrices(quotesWithTimestamp);
          setLastUpdated(new Date());
          setLoading(false);
        }
      })
      .subscribe();

    // Initial price fetch
    priceService.fetchLatestPricesForPair(baseToken, quoteToken)
      .then(quotes => {
        // Add timestamp to each price quote
        const quotesWithTimestamp = { ...quotes };
        Object.entries(quotesWithTimestamp).forEach(([key, quote]: [string, any]) => {
          quotesWithTimestamp[key] = {
            ...quote,
            timestamp: Date.now(),
            dexName: key
          };
        });
        
        setPrices(quotesWithTimestamp);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching initial prices:', err);
        setError('Failed to fetch initial prices');
        setLoading(false);
      });

    return () => {
      monitor.stopMonitoring(baseToken, quoteToken);
      supabase.removeChannel(channel);
    };
  }, [baseToken, quoteToken]);

  return { 
    prices, 
    priceImpacts,
    loading, 
    error, 
    lastUpdated,
    calculatePriceImpact
  };
}
