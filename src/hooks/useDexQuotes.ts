
import { useState, useEffect } from 'react';
import { PriceQuote } from '@/services/dex/types';
import { TokenInfo } from '@/services/tokenListService';
import DexRegistry from '@/services/dex/DexRegistry';

export function useDexQuotes(baseToken: TokenInfo | null, quoteToken: TokenInfo | null, amount: number = 1) {
  const [quotes, setQuotes] = useState<PriceQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!baseToken || !quoteToken) {
        setQuotes([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const dexRegistry = DexRegistry.getInstance();
        const adapters = dexRegistry.getAdaptersForChain(baseToken.chainId);
        
        const quotePromises = adapters.map(adapter => 
          adapter.fetchQuote(baseToken, quoteToken, amount)
            .catch(error => {
              console.error(`Error fetching quote from ${adapter.getName()}:`, error);
              return null;
            })
        );

        const results = await Promise.all(quotePromises);
        const validQuotes = results.filter((quote): quote is PriceQuote => quote !== null);
        
        setQuotes(validQuotes);
      } catch (err) {
        console.error('Error fetching DEX quotes:', err);
        setError('Failed to fetch quotes from DEXes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [baseToken, quoteToken, amount]);

  return { quotes, loading, error };
}
