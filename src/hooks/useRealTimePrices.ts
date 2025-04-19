
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { supabase } from '@/lib/supabaseClient';

/**
 * Hook to fetch real-time price data from multiple DEXes
 */
export function useRealTimePrices(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  pollingInterval = 10000 // 10 seconds by default
) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch prices from the Edge Function or directly from DEXes
  const fetchPrices = async () => {
    if (!baseToken || !quoteToken) return;
    
    setLoading(true);
    setError(null);

    try {
      // Call fetch-prices Edge Function
      const { data, error } = await supabase.functions.invoke('fetch-prices', {
        body: { 
          baseToken, 
          quoteToken
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.prices) {
        // Convert to PriceQuote format
        const quotes: Record<string, PriceQuote> = {};
        
        for (const dex in data.prices) {
          quotes[dex] = {
            dexName: dex,
            price: data.prices[dex].price,
            fees: data.prices[dex].tradingFee || 0.003,
            gasEstimate: baseToken.chainId === 101 ? 0.00001 : 0.005,
            liquidityUSD: data.prices[dex].liquidity || 100000,
            timestamp: data.prices[dex].timestamp || Date.now(),
            isFallback: !!data.prices[dex].isFallback,
            isMock: !!data.prices[dex].isMock
          };
        }
        
        setPrices(quotes);
      } else {
        throw new Error('No price data received');
      }
    } catch (err) {
      console.error('Error fetching real-time prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      
      // Fallback to database if Edge Function fails
      await fetchPricesFromDatabase();
    } finally {
      setLoading(false);
    }
  };
  
  // Fallback method to get prices from database
  const fetchPricesFromDatabase = async () => {
    if (!baseToken || !quoteToken) return;
    
    try {
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      
      // Get latest price for each DEX from database
      const { data, error } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', tokenPair)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const quotes: Record<string, PriceQuote> = {};
        const processedDexes = new Set<string>();

        // Group by DEX and get most recent price for each
        data.forEach(item => {
          if (!processedDexes.has(item.dex_name)) {
            processedDexes.add(item.dex_name);
            
            quotes[item.dex_name] = {
              dexName: item.dex_name,
              price: item.price,
              fees: 0.003, // Default fee
              gasEstimate: baseToken.chainId === 101 ? 0.00001 : 0.005,
              liquidityUSD: item.liquidity || 100000,
              timestamp: new Date(item.timestamp).getTime(),
              isFallback: true
            };
          }
        });

        setPrices(quotes);
      }
    } catch (err) {
      console.error('Error fetching from database:', err);
    }
  };

  // Fetch prices on mount and when tokens change
  useEffect(() => {
    if (baseToken && quoteToken) {
      fetchPrices();
      
      // Set up polling for price updates
      const interval = setInterval(fetchPrices, pollingInterval);
      
      return () => clearInterval(interval);
    } else {
      setPrices({});
    }
  }, [baseToken?.address, quoteToken?.address]);

  return { prices, loading, error, refetch: fetchPrices };
}
