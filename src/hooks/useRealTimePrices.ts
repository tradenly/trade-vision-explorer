
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { useToast } from './use-toast';

/**
 * Hook to fetch real-time price data for a token pair
 */
export function useRealTimePrices(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  refreshInterval = 10000  // Refresh every 10 seconds by default
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!baseToken || !quoteToken) {
      return;
    }

    // Initialize on-chain price service
    const priceService = OnChainPriceService.getInstance();
    let isMounted = true;
    setLoading(true);

    // Function to fetch prices
    const fetchPrices = async () => {
      try {
        console.log(`Fetching prices for ${baseToken.symbol}/${quoteToken.symbol}`);
        const onChainPrices = await priceService.getOnChainPrices(baseToken, quoteToken);
        
        if (isMounted) {
          if (Object.keys(onChainPrices).length > 0) {
            setPrices(onChainPrices);
            setError(null);
          } else {
            // Don't update state if no prices returned, but don't set error
            console.log('No prices returned from price service');
          }
        }
      } catch (err) {
        console.error('Error fetching real-time prices:', err);
        if (isMounted) {
          setError('Failed to fetch real-time prices');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch prices immediately
    fetchPrices();

    // Set up interval for refreshing prices
    const intervalId = setInterval(fetchPrices, refreshInterval);

    // Clean up
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [baseToken, quoteToken, refreshInterval]);

  // Return states
  return {
    prices,
    loading,
    error,
    refresh: async () => {
      setLoading(true);
      try {
        const priceService = OnChainPriceService.getInstance();
        if (baseToken && quoteToken) {
          const refreshedPrices = await priceService.getOnChainPrices(baseToken, quoteToken);
          setPrices(refreshedPrices);
        }
      } catch (err) {
        console.error('Error refreshing prices:', err);
      } finally {
        setLoading(false);
      }
    }
  };
}
