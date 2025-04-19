
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
  
  const priceServiceRef = useRef<RealTimePriceService | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  
  useEffect(() => {
    priceServiceRef.current = RealTimePriceService.getInstance();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchPrices = async () => {
    if (!baseToken || !quoteToken || !priceServiceRef.current) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newPrices = await priceServiceRef.current.getPrices(baseToken, quoteToken);
      
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
    
    if (baseToken && quoteToken && priceServiceRef.current) {
      fetchPrices();
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(fetchPrices, refreshInterval);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [baseToken, quoteToken, refreshInterval]);

  const refreshPrices = () => {
    if (priceServiceRef.current) {
      priceServiceRef.current.clearCache();
      fetchPrices();
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
