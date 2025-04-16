import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { useToast } from '@/hooks/use-toast';

export const useTokens = (initialChainId: ChainId = ChainId.ETHEREUM) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allTokens, setAllTokens] = useState<Record<number, TokenInfo[]>>({});
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChainId);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [popularTokens, setPopularTokens] = useState<Record<number, TokenInfo[]>>({});
  
  const { toast } = useToast();

  // Common quote tokens by chain
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

  // Fetch tokens from API endpoints
  const fetchTokens = useCallback(async (chainId: ChainId): Promise<TokenInfo[]> => {
    try {
      let url = '';
      switch (chainId) {
        case ChainId.ETHEREUM:
          // CoinGecko API is CORS-friendly
          url = 'https://tokens.coingecko.com/uniswap/all.json';
          break;
        case ChainId.BNB:
          // CoinGecko BNB Chain tokens
          url = 'https://tokens.coingecko.com/binance-smart-chain/all.json';
          break;
        case ChainId.SOLANA:
          // For Solana, we'll use our default list as Jupiter API doesn't have a simple token list endpoint
          return defaultTokensByChain[ChainId.SOLANA];
        default:
          throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      console.log(`Fetching tokens for chain ${chainId} from ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API response error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.tokens || !Array.isArray(data.tokens)) {
        throw new Error('Invalid token list format');
      }
      
      // Filter for tokens matching our chain ID and validate
      const tokens = data.tokens
        .filter((token: any) => {
          // For CoinGecko lists, we need to filter by chainId
          if (chainId === ChainId.ETHEREUM && token.chainId === 1) return true;
          if (chainId === ChainId.BNB && token.chainId === 56) return true;
          return false;
        })
        .map((token: any) => ({
          ...token,
          chainId: chainId, // Ensure chainId is consistent
        }));
      
      console.log(`Fetched ${tokens.length} tokens for chain ${chainId}`);
      return tokens;
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
        const results: Record<number, TokenInfo[]> = {};
        
        // Load tokens for the selected chain first
        const tokens = await fetchTokens(selectedChain);
        results[selectedChain] = tokens;
        
        if (!isMounted) return;
        
        // Ensure all tokens have valid addresses and valid properties
        const validatedTokens = tokens
          .filter(token => token && token.symbol && token.name) // Filter out invalid tokens
          .map(ensureValidAddress);
        
        // Make sure required tokens are always present
        const defaultSymbols = new Set(defaultTokensByChain[selectedChain].map(t => t.symbol));
        
        // Find default tokens that need to be added
        const existingSymbols = new Set(validatedTokens.map(t => t.symbol));
        const missingDefaultTokens = defaultTokensByChain[selectedChain]
          .filter(dt => !existingSymbols.has(dt.symbol))
          .map(ensureValidAddress);
        
        // Combine default tokens with fetched tokens, putting defaults first
        results[selectedChain] = [...missingDefaultTokens, ...validatedTokens];
        
        // Filter out duplicates (keep the first occurrence which will be from defaults if present)
        const seenSymbols = new Set<string>();
        results[selectedChain] = results[selectedChain].filter(token => {
          if (!token.symbol) return false;
          if (seenSymbols.has(token.symbol)) {
            return false;
          }
          seenSymbols.add(token.symbol);
          return true;
        });
        
        // Create popular tokens list for the selected chain
        const popular: Record<number, TokenInfo[]> = {};
        
        if (selectedChain === ChainId.ETHEREUM) {
          popular[ChainId.ETHEREUM] = results[ChainId.ETHEREUM]
            ?.filter(token => ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'].includes(token.symbol || ''))
            ?.slice(0, 10) || defaultTokensByChain[ChainId.ETHEREUM];
        } else if (selectedChain === ChainId.BNB) {
          popular[ChainId.BNB] = results[ChainId.BNB]
            ?.filter(token => ['BNB', 'WBNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTCB', 'DOT', 'ADA', 'XRP'].includes(token.symbol || ''))
            ?.slice(0, 10) || defaultTokensByChain[ChainId.BNB];
        } else if (selectedChain === ChainId.SOLANA) {
          popular[ChainId.SOLANA] = results[ChainId.SOLANA]
            ?.filter(token => ['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'JUP', 'RAY', 'ORCA', 'MNGO'].includes(token.symbol || ''))
            ?.slice(0, 10) || defaultTokensByChain[ChainId.SOLANA];
        }
        
        console.log(`Setting tokens for chain ${selectedChain}: ${results[selectedChain].length} tokens`);
        setAllTokens(prevTokens => ({...prevTokens, ...results}));
        setPopularTokens(prevPopular => ({...prevPopular, ...popular}));
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
        
        setAllTokens(prevTokens => ({...prevTokens, ...fallbackTokens}));
        setPopularTokens(prevPopular => ({...prevPopular, ...fallbackTokens})); // Use same tokens for popular
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

  // Get chain tokens
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
