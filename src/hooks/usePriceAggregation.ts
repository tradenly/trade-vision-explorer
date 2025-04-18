
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { PriceAggregationService } from '@/services/dex/services/PriceAggregationService';

export function usePriceAggregation(
  baseToken: TokenInfo | null, 
  quoteToken: TokenInfo | null,
  refreshInterval: number = 30000
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!baseToken || !quoteToken) {
      return;
    }

    const fetchPrices = async () => {
      setLoading(true);
      setError(null);

      try {
        const priceAggregationService = PriceAggregationService.getInstance();
        const newPrices = await priceAggregationService.aggregatePrices(baseToken, quoteToken);
        
        setPrices(newPrices);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error fetching aggregated prices:', err);
        setError('Failed to fetch price data');
      } finally {
        setLoading(false);
      }
    };

    // Fetch prices immediately
    fetchPrices();

    // Set up interval to fetch prices
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [baseToken, quoteToken, refreshInterval]);

  const getHistoricalPrices = async (dexName?: string, limit: number = 100) => {
    if (!baseToken || !quoteToken) {
      return [];
    }

    try {
      const priceAggregationService = PriceAggregationService.getInstance();
      return await priceAggregationService.getHistoricalPrices(baseToken, quoteToken, dexName, limit);
    } catch (err) {
      console.error('Error fetching historical prices:', err);
      return [];
    }
  };

  return {
    prices,
    loading,
    error,
    lastUpdated,
    getHistoricalPrices
  };
}
