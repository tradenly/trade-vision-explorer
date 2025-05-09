
import { useState, useEffect, useRef } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import RealTimePriceService from '@/services/dex/services/RealTimePriceService';

export function useRealTimePrices(
  baseToken: TokenInfo | null, 
  quoteToken: TokenInfo | null,
  refreshInterval = 15000
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Define the configuration object
  const priceServiceConfig = {
    cacheDuration: refreshInterval,
    retryDelay: 2000,
    maxRetries: 2
  };
  
  // Fix: Pass the configuration object to getInstance()
  const priceService = useRef(RealTimePriceService.getInstance(priceServiceConfig));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchPrices = async (forceRefresh = false) => {
    if (!baseToken || !quoteToken || !priceService.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Pass an object with options
      const newPrices = await priceService.current.getPrices(baseToken, quoteToken, { forceRefresh, retries: 0 });
      
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (baseToken && quoteToken && priceService.current) {
      fetchPrices(false);
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(() => fetchPrices(false), refreshInterval);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [baseToken, quoteToken, refreshInterval]);

  const refreshPrices = () => {
    if (priceService.current) {
      priceService.current.clearCache();
      fetchPrices(true);
    }
  };

  return {
    prices,
    loading,
    error,
    lastUpdated,
    refreshPrices
  };
}
