
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import {
  getTokensForChain,
  getQuoteTokensForChain,
  getPopularTokensForChain,
  DEFAULT_TOKENS,
  getSafeTokenValue,
} from '@/services/tokenDataService';
import { toast } from '@/hooks/use-toast';

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
      const safeValue = getSafeTokenValue(token);
      return {
        ...token,
        address: safeValue
      };
    }
    return token;
  }, []);

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
        
        // Only allow ETH, BNB, and Solana for now
        if (![ChainId.ETHEREUM, ChainId.BNB, ChainId.SOLANA].includes(selectedChain)) {
          throw new Error('Unsupported chain selected');
        }

        // Set defaults immediately while loading
        const defaultTokens = DEFAULT_TOKENS[selectedChain] || [];
        if (defaultTokens.length > 0 && isMounted) {
          setAllChainTokens(defaultTokens.map(ensureValidAddress));
          setQuoteTokens(getQuoteTokensForChain(selectedChain, defaultTokens).map(ensureValidAddress));
          setPopularTokens(getPopularTokensForChain(selectedChain, defaultTokens).map(ensureValidAddress));
          setLoading(false);
        }

        // Fetch tokens from API
        const tokens = await getTokensForChain(selectedChain);
        
        if (!isMounted) return;
        
        if (tokens && tokens.length > 0) {
          const validatedTokens = tokens.map(ensureValidAddress);
          setAllChainTokens(validatedTokens);
          setQuoteTokens(getQuoteTokensForChain(selectedChain, validatedTokens));
          setPopularTokens(getPopularTokensForChain(selectedChain, validatedTokens));
          setLastFetch(prev => ({ ...prev, [selectedChain]: now }));
          console.log(`Successfully loaded ${tokens.length} tokens for chain ${selectedChain}`);
        } else if (defaultTokens.length === 0) {
          throw new Error('No tokens available for this chain');
        }
      } catch (err) {
        console.error('Error loading tokens:', err);
        
        if (!isMounted) return;
        
        setError(`Failed to load tokens: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Use default tokens as fallback
        const defaultTokens = DEFAULT_TOKENS[selectedChain] || [];
        
        if (defaultTokens.length > 0) {
          setAllChainTokens(defaultTokens.map(ensureValidAddress));
          setQuoteTokens(getQuoteTokensForChain(selectedChain, defaultTokens).map(ensureValidAddress));
          setPopularTokens(getPopularTokensForChain(selectedChain, defaultTokens).map(ensureValidAddress));
          
          toast({
            title: "Using default token list",
            description: "Could not load latest token data",
            variant: "default"
          });
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
  }, [selectedChain, isLoadingChain, lastFetch, allChainTokens, ensureValidAddress]);

  const handleChainChange = useCallback((chainId: ChainId) => {
    if (![ChainId.ETHEREUM, ChainId.BNB, ChainId.SOLANA].includes(chainId)) {
      console.warn('Unsupported chain selected:', chainId);
      toast({
        title: "Unsupported Chain",
        description: "Only Ethereum, BNB Chain, and Solana are supported",
        variant: "destructive"
      });
      return;
    }
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
