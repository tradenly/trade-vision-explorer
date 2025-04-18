
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export const useTokensSimple = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [allChainTokens, setAllChainTokens] = useState<TokenInfo[]>([]);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);
  const [lastFetch, setLastFetch] = useState<Record<number, number>>({});

  const ensureValidAddress = useCallback((token: TokenInfo): TokenInfo => {
    if (!token.address || token.address === '' || token.address === 'undefined') {
      return {
        ...token,
        address: token.symbol.toLowerCase() // Use symbol as fallback address
      };
    }
    return token;
  }, []);

  // Function to get quote tokens from all tokens
  const getQuoteTokensForChain = useCallback((tokens: TokenInfo[]): TokenInfo[] => {
    const stableSymbols = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDC.e'];
    const wrappedSymbols = ['WETH', 'WBTC', 'WBNB', 'WSOL'];
    
    // Find quote tokens (stables and wrapped tokens)
    const quoteTokens = tokens.filter(token => 
      stableSymbols.includes(token.symbol) || 
      wrappedSymbols.includes(token.symbol)
    );
    
    // If no quote tokens found, add the default ones
    if (quoteTokens.length === 0) {
      const defaultQuotes = getDefaultTokensForChain(selectedChain).filter(token =>
        stableSymbols.includes(token.symbol) || wrappedSymbols.includes(token.symbol)
      );
      return defaultQuotes;
    }
    
    return quoteTokens;
  }, [selectedChain]);

  // Function to get popular tokens from all tokens
  const getPopularTokensForChain = useCallback((tokens: TokenInfo[]): TokenInfo[] => {
    // Depending on chain, different tokens are popular
    const popularByChain: Record<number, string[]> = {
      [ChainId.ETHEREUM]: ['ETH', 'WETH', 'BTC', 'WBTC', 'LINK', 'UNI', 'AAVE', 'USDC', 'USDT'],
      [ChainId.BNB]: ['BNB', 'WBNB', 'CAKE', 'LINK', 'DOT', 'BTCB', 'ETH', 'BUSD', 'USDT'],
      [ChainId.SOLANA]: ['SOL', 'WSOL', 'BTC', 'ETH', 'USDC', 'USDT', 'RAY', 'SRM', 'ORCA', 'BONK', 'JUP'],
    };
    
    const popularSymbols = popularByChain[selectedChain] || [];
    
    // Find popular tokens
    const found = tokens.filter(token => 
      popularSymbols.includes(token.symbol)
    ).sort((a, b) => {
      // Sort by position in the array
      const aIndex = popularSymbols.indexOf(a.symbol);
      const bIndex = popularSymbols.indexOf(b.symbol);
      return aIndex - bIndex;
    });
    
    // If not enough popular tokens found, add defaults
    if (found.length < 5) {
      const defaults = getDefaultTokensForChain(selectedChain);
      
      // Add any missing popular tokens from defaults
      const combined = [...found];
      for (const token of defaults) {
        if (!combined.some(t => t.symbol === token.symbol)) {
          combined.push(token);
        }
      }
      
      return combined;
    }
    
    return found;
  }, [selectedChain]);

  // Load tokens from API or use default tokens
  useEffect(() => {
    let isMounted = true;
    
    async function loadTokensForChain() {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        // Check if we recently fetched this chain's tokens
        const now = Date.now();
        const lastFetchTime = lastFetch[selectedChain] || 0;
        
        // Only fetch if more than 5 minutes have passed since last fetch
        if (now - lastFetchTime > 5 * 60 * 1000) {
          console.log('Fetching fresh token data...');
          
          // Call our edge function to get tokens
          const { data, error } = await supabase.functions.invoke('fetch-tokens', {
            body: { chainId: selectedChain }
          });
          
          if (error) throw error;
          
          if (data?.tokens && Array.isArray(data.tokens)) {
            const tokens = data.tokens.map(ensureValidAddress);
            console.log(`Successfully fetched ${tokens.length} tokens for chain ${selectedChain}`);
            
            if (!isMounted) return;
            
            // Update state with the tokens
            setAllChainTokens(tokens);
            
            // Extract quote and popular tokens
            const extractedQuoteTokens = getQuoteTokensForChain(tokens);
            const extractedPopularTokens = getPopularTokensForChain(tokens);
            
            setQuoteTokens(extractedQuoteTokens);
            setPopularTokens(extractedPopularTokens);
            
            // Update last fetch time
            setLastFetch(prev => ({ ...prev, [selectedChain]: now }));
            console.log(`Set ${extractedQuoteTokens.length} quote tokens and ${extractedPopularTokens.length} popular tokens`);
            
            setLoading(false);
            return;
          }
        } else {
          console.log('Using cached token data');
        }
        
        // If no fresh data, use default tokens
        if (allChainTokens.length === 0) {
          const defaultTokens = getDefaultTokensForChain(selectedChain);
          setAllChainTokens(defaultTokens);
          setQuoteTokens(getQuoteTokensForChain(defaultTokens));
          setPopularTokens(getPopularTokensForChain(defaultTokens));
        }
        
      } catch (err) {
        console.error('Error in loadTokensForChain:', err);
        
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : 'Failed to load tokens');
        
        // Use default tokens as fallback
        const defaultTokens = getDefaultTokensForChain(selectedChain);
        setAllChainTokens(defaultTokens);
        setQuoteTokens(getQuoteTokensForChain(defaultTokens));
        setPopularTokens(getPopularTokensForChain(defaultTokens));
        
        toast({
          title: "Error loading tokens",
          description: "Using default token list",
          variant: "destructive"
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTokensForChain();
    
    return () => {
      isMounted = false;
    };
  }, [selectedChain, ensureValidAddress, getQuoteTokensForChain, getPopularTokensForChain, allChainTokens.length, lastFetch]);

  const handleChainChange = useCallback((chainId: ChainId) => {
    console.log(`Chain changed to: ${chainId}`);
    setSelectedChain(chainId);
  }, []);

  const refreshTokens = useCallback(() => {
    // Force a refresh by clearing the last fetch timestamp
    setLastFetch(prev => ({ ...prev, [selectedChain]: 0 }));
    setAllChainTokens([]);
  }, [selectedChain]);

  return {
    loading,
    error,
    selectedChain,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange,
    refreshTokens,
    ensureValidAddress
  };
};

// Helper function for fallback tokens
function getDefaultTokensForChain(chainId: ChainId): TokenInfo[] {
  switch (chainId) {
    case ChainId.ETHEREUM:
      return [
        { name: 'Ethereum', symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 1, decimals: 18 },
        { name: 'Wrapped Ethereum', symbol: 'WETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', chainId: 1, decimals: 18 },
        { name: 'USD Coin', symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chainId: 1, decimals: 6 },
        { name: 'Tether USD', symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', chainId: 1, decimals: 6 },
        { name: 'Dai Stablecoin', symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', chainId: 1, decimals: 18 },
      ];
    case ChainId.BNB:
      return [
        { name: 'BNB', symbol: 'BNB', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 56, decimals: 18 },
        { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', chainId: 56, decimals: 18 },
        { name: 'Binance-Peg BUSD Token', symbol: 'BUSD', address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', chainId: 56, decimals: 18 },
        { name: 'Binance-Peg USDT Token', symbol: 'USDT', address: '0x55d398326f99059ff775485246999027b3197955', chainId: 56, decimals: 18 },
        { name: 'PancakeSwap Token', symbol: 'CAKE', address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', chainId: 56, decimals: 18 },
      ];
    case ChainId.SOLANA:
      return [
        { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', chainId: 101, decimals: 9 },
        { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chainId: 101, decimals: 6 },
        { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chainId: 101, decimals: 6 },
        { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chainId: 101, decimals: 5 },
        { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chainId: 101, decimals: 6 },
      ];
    default:
      return [];
  }
}
