
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for managing token data across different chains
 */
export const useTokens = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allTokens, setAllTokens] = useState<Record<number, TokenInfo[]>>({});
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [popularTokens, setPopularTokens] = useState<Record<number, TokenInfo[]>>({});

  // Common quote tokens by chain - these are the tokens that will be shown in the quote token dropdown
  const commonQuoteTokens: Record<number, string[]> = {
    [ChainId.ETHEREUM]: ['USDT', 'USDC', 'DAI', 'WETH', 'WBTC'],
    [ChainId.BNB]: ['BUSD', 'USDT', 'USDC', 'WBNB', 'ETH'],
    [ChainId.SOLANA]: ['USDC', 'USDT', 'SOL', 'BTC', 'ETH']
  };

  // Default tokens for each chain as fallback
  const defaultTokensByChain: Record<number, TokenInfo[]> = {
    [ChainId.ETHEREUM]: [
      { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
      { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
      { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
      { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
      { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
    ],
    [ChainId.BNB]: [
      { name: 'BNB', symbol: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.BNB },
      { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, chainId: ChainId.BNB },
      { name: 'BUSD', symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, chainId: ChainId.BNB },
      { name: 'USDT', symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, chainId: ChainId.BNB },
    ],
    [ChainId.SOLANA]: [
      { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9, chainId: ChainId.SOLANA },
      { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, chainId: ChainId.SOLANA },
      { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, chainId: ChainId.SOLANA },
      { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, chainId: ChainId.SOLANA },
      { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, chainId: ChainId.SOLANA },
    ],
  };

  // Generate a stable unique ID for tokens
  const getStableTokenId = useCallback((token: TokenInfo): string => {
    if (!token || !token.symbol) {
      return `unknown-token`;
    }
    
    if (!token.address || token.address === '' || token.address === 'undefined') {
      return `${token.symbol}-${token.chainId}-fallback`;
    }
    return token.address;
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

  // Fetch tokens from API endpoints with reliable CORS support
  const fetchTokens = useCallback(async (chainId: ChainId): Promise<TokenInfo[]> => {
    try {
      // CORS-friendly endpoints for token lists
      let url = '';
      
      switch (chainId) {
        case ChainId.ETHEREUM:
          url = 'https://tokens.coingecko.com/uniswap/all.json'; // CORS-friendly
          break;
        case ChainId.BNB:
          url = 'https://tokens.coingecko.com/binance-smart-chain/all.json'; // CORS-friendly
          break;
        case ChainId.SOLANA:
          // No direct CORS-friendly endpoint for Solana tokens
          // We'll use our default list for now
          console.log('Using default Solana tokens');
          return defaultTokensByChain[ChainId.SOLANA];
        default:
          console.log('Using default tokens for chain', chainId);
          return defaultTokensByChain[chainId] || [];
      }

      console.log(`Fetching tokens for chain ${chainId} from ${url}`);
      
      // Use a proxy if needed for CORS
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        // Add cache control to prevent caching issues
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        throw new Error(`API response error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.tokens || !Array.isArray(data.tokens)) {
        console.warn('Invalid token list format from API');
        return defaultTokensByChain[chainId] || [];
      }
      
      // Filter for tokens matching our chain ID and validate
      let tokens = [];
      
      if (chainId === ChainId.ETHEREUM) {
        tokens = data.tokens.filter((t: any) => t.chainId === 1);
      } else if (chainId === ChainId.BNB) {
        tokens = data.tokens.filter((t: any) => t.chainId === 56);
      } else {
        tokens = data.tokens;
      }
      
      // Normalize token data
      const normalizedTokens = tokens.map((token: any) => ({
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        logoURI: token.logoURI,
        chainId: chainId, // Ensure chainId is set correctly
      }));
      
      console.log(`Fetched ${normalizedTokens.length} tokens for chain ${chainId}`);
      
      if (normalizedTokens.length === 0) {
        console.log('No tokens found, using defaults');
        return defaultTokensByChain[chainId] || [];
      }
      
      return normalizedTokens;
    } catch (error) {
      console.error(`Error fetching tokens for chain ${chainId}:`, error);
      // Return default tokens as fallback
      return defaultTokensByChain[chainId] || [];
    }
  }, [defaultTokensByChain]);

  // Load tokens when chain changes
  useEffect(() => {
    let isMounted = true;
    
    async function loadTokens() {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Loading tokens for chain ${selectedChain}`);
        
        // Try to load tokens for the selected chain
        let tokens: TokenInfo[] = [];
        
        try {
          tokens = await fetchTokens(selectedChain);
        } catch (err) {
          console.error('Error fetching tokens:', err);
          toast({
            title: "Error fetching tokens",
            description: "Using default token list instead",
            variant: "default"
          });
          tokens = defaultTokensByChain[selectedChain] || [];
        }
        
        if (!isMounted) return;
        
        // Ensure all tokens have valid addresses and properties
        const validatedTokens = tokens
          .filter(token => token && token.symbol && token.name) // Filter out invalid tokens
          .map(ensureValidAddress);
        
        // Add default tokens if any are missing
        const existingSymbols = new Set(validatedTokens.map(t => t.symbol));
        const missingDefaultTokens = defaultTokensByChain[selectedChain]
          .filter(dt => !existingSymbols.has(dt.symbol))
          .map(ensureValidAddress);
        
        // Combine default tokens with fetched tokens, prioritizing defaults
        const combinedTokens = [...missingDefaultTokens, ...validatedTokens];
        
        // Store tokens for the selected chain
        setAllTokens(prevTokens => ({
          ...prevTokens,
          [selectedChain]: combinedTokens
        }));
        
        // Create popular tokens for quick access
        const popularByChain: Record<number, TokenInfo[]> = {};
        
        // Select common tokens based on chain
        if (selectedChain === ChainId.ETHEREUM) {
          popularByChain[ChainId.ETHEREUM] = combinedTokens
            .filter(token => ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC'].includes(token.symbol || ''))
            .slice(0, 10);
        } else if (selectedChain === ChainId.BNB) {
          popularByChain[ChainId.BNB] = combinedTokens
            .filter(token => ['BNB', 'WBNB', 'BUSD', 'USDT', 'USDC'].includes(token.symbol || ''))
            .slice(0, 10);
        } else if (selectedChain === ChainId.SOLANA) {
          popularByChain[ChainId.SOLANA] = combinedTokens
            .filter(token => ['SOL', 'USDC', 'USDT', 'BONK', 'JUP'].includes(token.symbol || ''))
            .slice(0, 10);
        }
        
        // Ensure we have at least some popular tokens
        if (!popularByChain[selectedChain] || popularByChain[selectedChain].length === 0) {
          popularByChain[selectedChain] = defaultTokensByChain[selectedChain];
        }
        
        setPopularTokens(prevPopular => ({
          ...prevPopular,
          ...popularByChain
        }));
        
        console.log(`Setting tokens for chain ${selectedChain}: ${combinedTokens.length} tokens`);
      } catch (error) {
        console.error('Error loading tokens:', error);
        
        if (!isMounted) return;
        
        setError('Failed to load token list');
        toast({
          title: "Failed to load tokens",
          description: "Using fallback token lists. Some features may be limited.",
          variant: "destructive"
        });
        
        // Use default tokens as fallback
        const fallbackTokens: Record<number, TokenInfo[]> = { 
          [selectedChain]: defaultTokensByChain[selectedChain].map(ensureValidAddress),
        };
        
        setAllTokens(prevTokens => ({
          ...prevTokens,
          ...fallbackTokens
        }));
        
        setPopularTokens(prevPopular => ({
          ...prevPopular,
          [selectedChain]: defaultTokensByChain[selectedChain]
        }));
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTokens();
    
    return () => {
      isMounted = false;
    };
  }, [selectedChain, ensureValidAddress, fetchTokens, toast, defaultTokensByChain]);

  // Handle chain selection change
  const handleChainChange = useCallback((chainId: ChainId) => {
    console.log(`Chain changed to: ${chainId}`);
    setSelectedChain(chainId);
    // Reset token selections when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  }, []);

  // Get filtered quote tokens for the selected chain
  const getQuoteTokens = useCallback((): TokenInfo[] => {
    const chainTokens = allTokens[selectedChain] || [];
    console.log(`Getting quote tokens for chain ${selectedChain}. Available tokens: ${chainTokens.length}`);
    
    const commonSymbols = commonQuoteTokens[selectedChain] || [];
    const filteredTokens = chainTokens.filter(token => 
      token.symbol && commonSymbols.includes(token.symbol)
    );
    
    console.log(`Found ${filteredTokens.length} quote tokens`);
    
    // If no filtered tokens, return some default ones based on chain
    if (filteredTokens.length === 0) {
      console.log('Using default quote tokens');
      return defaultTokensByChain[selectedChain] || [];
    }
    
    return filteredTokens;
  }, [allTokens, selectedChain, commonQuoteTokens, defaultTokensByChain]);

  // Get all tokens for the current chain
  const getChainTokens = useCallback((): TokenInfo[] => {
    const tokens = allTokens[selectedChain] || [];
    console.log(`Getting all tokens for chain ${selectedChain}. Available tokens: ${tokens.length}`);
    
    // If no tokens available, return defaults
    if (tokens.length === 0) {
      console.log('Using default tokens for chain');
      return defaultTokensByChain[selectedChain].map(ensureValidAddress) || [];
    }
    
    return tokens;
  }, [allTokens, selectedChain, ensureValidAddress, defaultTokensByChain]);

  // Get a safe token value for dropdowns
  const getSafeTokenValue = useCallback((token: TokenInfo | null): string => {
    if (!token) return "";
    if (!token.symbol) return "";
    if (!token.address || token.address === '' || token.address === 'undefined') {
      return `${token.symbol}-${token.chainId}-fallback`;
    }
    return token.address;
  }, []);

  // Find token by address or ID
  const findTokenByValue = useCallback((value: string): TokenInfo | undefined => {
    if (!value) return undefined;
    
    const chainTokens = allTokens[selectedChain] || [];
    return chainTokens.find(token => 
      token.address === value || 
      getSafeTokenValue(token) === value
    );
  }, [allTokens, selectedChain, getSafeTokenValue]);

  return {
    loading,
    error,
    allTokens,
    selectedChain,
    baseToken,
    quoteToken,
    popularTokens,
    handleChainChange,
    setBaseToken,
    setQuoteToken,
    getQuoteTokens,
    getChainTokens,
    getSafeTokenValue,
    getStableTokenId,
    findTokenByValue,
    ensureValidAddress
  };
};
