
import { useState, useEffect, useRef } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { RealTimePriceService } from '@/services/dex/services/RealTimePriceService';
import DexRegistry from '@/services/dex/DexRegistry';

export function useRealTimePrices(
  baseToken: TokenInfo | null, 
  quoteToken: TokenInfo | null,
  refreshInterval = 15000 // 15 seconds
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // The RealTimePriceService is a singleton and doesn't require parameters for getInstance()
  // But it might be initialized from its internal implementation
  const priceService = useRef<RealTimePriceService>(RealTimePriceService.getInstance());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  
  const fetchPrices = async () => {
    if (!baseToken || !quoteToken) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newPrices = await priceService.current.getPrices(baseToken, quoteToken);
      
      setPrices(newPrices);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching real-time prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    if (baseToken && quoteToken) {
      fetchPrices();
      
      // Set up interval for periodic updates
      intervalRef.current = setInterval(fetchPrices, refreshInterval);
    }
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [baseToken, quoteToken, refreshInterval]);
  
  const refreshPrices = () => {
    priceService.current.clearCache();
    fetchPrices();
  };
  
  return {
    prices,
    loading,
    error,
    lastUpdated,
    refreshPrices
  };
}
