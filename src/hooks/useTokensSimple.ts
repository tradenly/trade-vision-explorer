
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

export const useTokensSimple = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [allChainTokens, setAllChainTokens] = useState<TokenInfo[]>([]);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);
  const [isLoadingChain, setIsLoadingChain] = useState<boolean>(false);
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
    
    return quoteTokens;
  }, []);

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
    return tokens
      .filter(token => popularSymbols.includes(token.symbol))
      .sort((a, b) => {
        // Sort by position in the array
        const aIndex = popularSymbols.indexOf(a.symbol);
        const bIndex = popularSymbols.indexOf(b.symbol);
        return aIndex - bIndex;
      });
  }, [selectedChain]);

  useEffect(() => {
    let isMounted = true;
    
    async function loadTokensForChain() {
      if (isLoadingChain) return;
      
      // Check if we need to reload tokens (if last fetch was more than 5 minutes ago)
      const now = Date.now();
      const lastFetchTime = lastFetch[selectedChain] || 0;
      const needsRefresh = now - lastFetchTime > 5 * 60 * 1000; // 5 minutes
      
      if (!needsRefresh && allChainTokens.length > 0 && allChainTokens[0]?.chainId === selectedChain) {
        console.log(`Using cached tokens for chain ${selectedChain}`);
        return;
      }
      
      setIsLoadingChain(true);
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        // Fetch tokens from our Supabase edge function
        const { data, error } = await supabase.functions.invoke('fetch-tokens', {
          body: { chainId: selectedChain }
        });
        
        if (error) {
          throw new Error(`Error fetching tokens: ${error.message}`);
        }
        
        if (!data || !data.tokens || !Array.isArray(data.tokens) || data.tokens.length === 0) {
          throw new Error('No tokens returned from API');
        }
        
        const tokens = data.tokens.map(ensureValidAddress);
        
        if (!isMounted) return;
        
        if (tokens && tokens.length > 0) {
          setAllChainTokens(tokens);
          setQuoteTokens(getQuoteTokensForChain(tokens));
          setPopularTokens(getPopularTokensForChain(tokens));
          setLastFetch(prev => ({ ...prev, [selectedChain]: now }));
          console.log(`Successfully loaded ${tokens.length} tokens for chain ${selectedChain}`);
        } else {
          throw new Error('No tokens available for this chain');
        }
      } catch (err) {
        console.error('Error loading tokens:', err);
        
        if (!isMounted) return;
        
        setError(`Failed to load tokens: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Fetch fallback tokens from the database directly
        try {
          const { data: fallbackTokens } = await supabase
            .from('tokens')
            .select('*')
            .eq('chain_id', selectedChain)
            .order('is_popular', { ascending: false });
            
          if (fallbackTokens && fallbackTokens.length > 0) {
            // Convert DB format to TokenInfo format
            const tokens = fallbackTokens.map((token: any) => ({
              chainId: token.chain_id,
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              logoURI: token.logo_uri
            }));
            
            setAllChainTokens(tokens.map(ensureValidAddress));
            setQuoteTokens(getQuoteTokensForChain(tokens));
            setPopularTokens(getPopularTokensForChain(tokens));
          } else {
            // Use hardcoded defaults as last resort
            const defaultTokens = getDefaultTokensForChain(selectedChain);
            
            setAllChainTokens(defaultTokens.map(ensureValidAddress));
            setQuoteTokens(getQuoteTokensForChain(defaultTokens));
            setPopularTokens(getPopularTokensForChain(defaultTokens));
            
            toast({
              title: "Using default token list",
              description: "Could not load latest token data",
              variant: "default"
            });
          }
        } catch (fallbackError) {
          console.error('Error fetching fallback tokens:', fallbackError);
          
          // Use hardcoded defaults as last resort
          const defaultTokens = getDefaultTokensForChain(selectedChain);
          
          setAllChainTokens(defaultTokens.map(ensureValidAddress));
          setQuoteTokens(getQuoteTokensForChain(defaultTokens));
          setPopularTokens(getPopularTokensForChain(defaultTokens));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsLoadingChain(false);
        }
      }
    }

    loadTokensForChain();
    
    // Set up a refresh interval (every 10 minutes)
    const intervalId = setInterval(() => {
      loadTokensForChain();
    }, 10 * 60 * 1000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedChain, isLoadingChain, lastFetch, allChainTokens, ensureValidAddress, getQuoteTokensForChain, getPopularTokensForChain]);

  const handleChainChange = useCallback((chainId: ChainId) => {
    console.log(`Chain changed to: ${chainId}`);
    setSelectedChain(chainId);
  }, []);

  const refreshTokens = useCallback(() => {
    // Force a refresh by clearing the last fetch timestamp
    setLastFetch(prev => ({ ...prev, [selectedChain]: 0 }));
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
