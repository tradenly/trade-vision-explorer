
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import {
  getTokensForChain,
  getQuoteTokensForChain,
  getPopularTokensForChain,
  DEFAULT_TOKENS,
} from '@/services/tokenDataService';

export const useTokensSimple = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [allChainTokens, setAllChainTokens] = useState<TokenInfo[]>([]);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);
  const [isLoadingChain, setIsLoadingChain] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    async function loadTokensForChain() {
      if (isLoadingChain) return;
      
      setIsLoadingChain(true);
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        const tokens = await getTokensForChain(selectedChain);
        
        if (!isMounted) return;
        
        if (!tokens || tokens.length === 0) {
          console.warn(`No tokens found for chain ${selectedChain}, using defaults`);
          const defaults = DEFAULT_TOKENS[selectedChain] || [];
          setAllChainTokens(defaults);
          setQuoteTokens(getQuoteTokensForChain(selectedChain, defaults));
          setPopularTokens(getPopularTokensForChain(selectedChain, defaults));
        } else {
          setAllChainTokens(tokens);
          const quotes = getQuoteTokensForChain(selectedChain, tokens);
          setQuoteTokens(quotes);
          const popular = getPopularTokensForChain(selectedChain, tokens);
          setPopularTokens(popular);
          
          console.log(`Successfully loaded ${tokens.length} tokens for chain ${selectedChain}`);
        }
      } catch (err) {
        console.error('Error loading tokens:', err);
        
        if (!isMounted) return;
        
        setError('Failed to load tokens');
        
        // Use defaults as fallback
        const defaults = DEFAULT_TOKENS[selectedChain] || [];
        setAllChainTokens(defaults);
        setQuoteTokens(getQuoteTokensForChain(selectedChain, defaults));
        setPopularTokens(getPopularTokensForChain(selectedChain, defaults));
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsLoadingChain(false);
        }
      }
    }

    loadTokensForChain();
    
    return () => {
      isMounted = false;
    };
  }, [selectedChain, isLoadingChain]);

  const handleChainChange = useCallback((chainId: ChainId) => {
    console.log(`Chain changed to: ${chainId}`);
    setSelectedChain(chainId);
  }, []);

  const ensureValidAddress = useCallback((token: TokenInfo): TokenInfo => {
    if (!token) return token;
    
    if (!token.address || token.address === '' || token.address === 'undefined') {
      return {
        ...token,
        address: `generated-${token.symbol}-${token.chainId}-${Math.random().toString(36).substring(2, 7)}`
      };
    }
    return token;
  }, []);

  const getSafeTokenValue = useCallback((token: TokenInfo | null): string => {
    if (!token || !token.symbol) return "";
    if (!token.address || token.address === '') {
      return `${token.symbol}-${token.chainId}-fallback`;
    }
    return token.address;
  }, []);

  const findTokenByValue = useCallback((value: string): TokenInfo | undefined => {
    if (!value) return undefined;
    return allChainTokens.find(token => getSafeTokenValue(token) === value);
  }, [allChainTokens, getSafeTokenValue]);

  return {
    loading,
    error,
    selectedChain,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange,
    ensureValidAddress,
    getSafeTokenValue,
    findTokenByValue
  };
};
