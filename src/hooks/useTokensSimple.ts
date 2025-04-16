
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { toast } from '@/hooks/use-toast';
import {
  getTokensForChain,
  getQuoteTokensForChain,
  getPopularTokensForChain,
  getSafeTokenValue,
  findTokenByAddress,
  DEFAULT_TOKENS
} from '@/services/tokenDataService';

/**
 * Simplified hook for managing token data across different chains
 */
export const useTokensSimple = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [allChainTokens, setAllChainTokens] = useState<TokenInfo[]>([]);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([]);

  // Load tokens for the selected chain
  useEffect(() => {
    let isMounted = true;
    
    async function loadTokensForChain() {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        // Get all tokens for the chain
        const tokens = await getTokensForChain(selectedChain);
        
        if (!isMounted) return;
        
        if (!tokens || tokens.length === 0) {
          throw new Error(`No tokens found for chain ${selectedChain}`);
        }
        
        // Set all chain tokens
        setAllChainTokens(tokens);
        
        // Set quote tokens
        const quotes = getQuoteTokensForChain(selectedChain, tokens);
        setQuoteTokens(quotes);
        
        // Set popular tokens
        const popular = getPopularTokensForChain(selectedChain, tokens);
        setPopularTokens(popular);
        
        console.log(`Successfully loaded ${tokens.length} tokens for chain ${selectedChain}`);
      } catch (err) {
        console.error('Error loading tokens:', err);
        
        if (!isMounted) return;
        
        setError('Failed to load tokens');
        toast({
          title: "Failed to load tokens",
          description: "Using fallback token list. Some features may be limited.",
          variant: "destructive"
        });
        
        // Use defaults as fallback
        const defaults = DEFAULT_TOKENS[selectedChain] || [];
        setAllChainTokens(defaults);
        setQuoteTokens(defaults);
        setPopularTokens(defaults);
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
  }, [selectedChain, toast]);

  // Handle chain selection change
  const handleChainChange = useCallback((chainId: ChainId) => {
    console.log(`Chain changed to: ${chainId}`);
    setSelectedChain(chainId);
  }, []);

  // Ensure a token has a valid address
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

  // Find token by value
  const findTokenByValue = useCallback((value: string): TokenInfo | undefined => {
    if (!value) return undefined;
    
    return allChainTokens.find(token => 
      token.address === value || 
      getSafeTokenValue(token) === value
    );
  }, [allChainTokens]);

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
