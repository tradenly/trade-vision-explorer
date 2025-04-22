
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';

export function usePriceMonitor(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  isActive: boolean = false
) {
  const [priceData, setPriceData] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || !baseToken || !quoteToken) return;

    setLoading(true);
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;

    // Subscribe to real-time price updates
    const channel = supabase
      .channel('price-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dex_price_history',
          filter: `token_pair=eq.${tokenPair}`
        },
        (payload) => {
          setPriceData(prev => ({
            ...prev,
            [payload.new.dex_name]: {
              price: payload.new.price,
              timestamp: payload.new.timestamp,
              liquidityUSD: payload.new.liquidity,
              fees: payload.new.trading_fee
            }
          }));
        }
      )
      .subscribe();

    // Initial price fetch
    const fetchInitialPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('dex_price_history')
          .select('*')
          .eq('token_pair', tokenPair)
          .order('timestamp', { ascending: false })
          .limit(20);

        if (error) throw error;

        const latestPrices: Record<string, PriceQuote> = {};
        data.forEach(entry => {
          if (!latestPrices[entry.dex_name]) {
            latestPrices[entry.dex_name] = {
              price: entry.price,
              timestamp: entry.timestamp,
              liquidityUSD: entry.liquidity,
              fees: entry.trading_fee
            };
          }
        });

        setPriceData(latestPrices);
      } catch (err) {
        console.error('Error fetching initial prices:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPrices();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [baseToken, quoteToken, isActive]);

  return { priceData, loading, error };
}
