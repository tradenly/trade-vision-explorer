
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { OnChainPriceService } from '@/services/dex/services/OnChainPriceService';
import { useToast } from './use-toast';

export function useRealTimePrices(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  refreshInterval = 10000
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!baseToken || !quoteToken) {
      return;
    }

    const priceService = OnChainPriceService.getInstance();
    let isMounted = true;
    setLoading(true);

    const fetchPrices = async () => {
      try {
        console.log(`Fetching prices for ${baseToken.symbol}/${quoteToken.symbol}`);
        const onChainPrices = await priceService.getOnChainPrices(baseToken, quoteToken);
        
        if (isMounted) {
          if (Object.keys(onChainPrices).length > 0) {
            setPrices(onChainPrices);
            setError(null);
          } else {
            console.log('No prices returned from price service');
            
            toast({
              title: "Price Data Unavailable",
              description: `Could not fetch current prices for ${baseToken.symbol}/${quoteToken.symbol}`,
              variant: "destructive"  // Changed from "warning" to "destructive"
            });
          }
        }
      } catch (err) {
        console.error('Error fetching real-time prices:', err);
        if (isMounted) {
          setError('Failed to fetch real-time prices');
          
          toast({
            title: "Error Fetching Price Data",
            description: `There was an error getting price data for ${baseToken.symbol}/${quoteToken.symbol}`,
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPrices();
    const intervalId = setInterval(fetchPrices, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [baseToken, quoteToken, refreshInterval, toast]);

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
          toast({
            title: "Prices Updated",
            description: `Successfully refreshed ${baseToken.symbol}/${quoteToken.symbol} price data`,
            variant: "default"
          });
        }
      } catch (err) {
        console.error('Error refreshing prices:', err);
        toast({
          title: "Refresh Failed",
          description: "Failed to refresh price data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
  };
}
