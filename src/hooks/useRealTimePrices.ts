
import { useState, useEffect } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { RealTimePriceMonitor } from '@/services/dex/services/RealTimePriceMonitor';
import { PriceService } from '@/services/dex/services/PriceService';
import DexRegistry from '@/services/dex/DexRegistry';
import { supabase } from '@/lib/supabaseClient';

export function useRealTimePrices(baseToken: TokenInfo | null, quoteToken: TokenInfo | null) {
  const [prices, setPrices] = useState<Record<string, PriceQuote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseToken || !quoteToken) return;

    setLoading(true);
    setError(null);

    const dexRegistry = DexRegistry.getInstance();
    const priceService = new PriceService(dexRegistry);
    const monitor = RealTimePriceMonitor.getInstance(priceService);

    // Start monitoring this pair
    monitor.startMonitoring(baseToken, quoteToken);

    // Subscribe to real-time updates
    const channel = supabase.channel('price-updates')
      .on('broadcast', { event: 'price-update' }, (payload) => {
        const pairKey = `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`;
        if (payload.payload.pairKey === pairKey) {
          setPrices(payload.payload.quotes);
          setLoading(false);
        }
      })
      .subscribe();

    // Initial price fetch
    priceService.fetchLatestPricesForPair(baseToken, quoteToken)
      .then(quotes => {
        setPrices(quotes);
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

  return { prices, loading, error };
}
