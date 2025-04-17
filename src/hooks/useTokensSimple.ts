
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

  // Add the ensureValidAddress function
  const ensureValidAddress = useCallback((token: TokenInfo): TokenInfo => {
    if (!token.address || token.address === '' || token.address === 'undefined') {
      // Generate a safe value for the token
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
      
      setIsLoadingChain(true);
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        // Only allow ETH, BNB, and Solana
        if (![ChainId.ETHEREUM, ChainId.BNB, ChainId.SOLANA].includes(selectedChain)) {
          throw new Error('Unsupported chain selected');
        }

        // Get default tokens for this chain
        const defaultTokens = DEFAULT_TOKENS[selectedChain] || [];
        
        // Set defaults immediately while loading to prevent empty state
        if (defaultTokens.length > 0) {
          setAllChainTokens(defaultTokens);
          setQuoteTokens(getQuoteTokensForChain(selectedChain, defaultTokens));
          setPopularTokens(getPopularTokensForChain(selectedChain, defaultTokens));
        }

        // Then try to load from API
        const tokens = await getTokensForChain(selectedChain);
        
        if (!isMounted) return;
        
        if (tokens && tokens.length > 0) {
          setAllChainTokens(tokens);
          setQuoteTokens(getQuoteTokensForChain(selectedChain, tokens));
          setPopularTokens(getPopularTokensForChain(selectedChain, tokens));
          console.log(`Successfully loaded ${tokens.length} tokens for chain ${selectedChain}`);
        }
      } catch (err) {
        console.error('Error loading tokens:', err);
        
        if (!isMounted) return;
        
        setError('Failed to load tokens');
        // Use default tokens as fallback
        const defaultTokens = DEFAULT_TOKENS[selectedChain] || [];
        
        if (defaultTokens.length > 0) {
          setAllChainTokens(defaultTokens);
          setQuoteTokens(getQuoteTokensForChain(selectedChain, defaultTokens));
          setPopularTokens(getPopularTokensForChain(selectedChain, defaultTokens));
        }
        
        toast({
          title: "Using default token list",
          description: "Could not load latest token data",
          variant: "default"
        });
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
    if (![ChainId.ETHEREUM, ChainId.BNB, ChainId.SOLANA].includes(chainId)) {
      console.warn('Unsupported chain selected');
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

  return {
    loading,
    error,
    selectedChain,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange,
    ensureValidAddress
  };
};
