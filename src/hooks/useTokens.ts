
import { useState, useEffect, useCallback } from 'react';
import { ChainId, TokenInfo, fetchAllTokens } from '@/services/tokenListService';
import { useToast } from './use-toast';

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

  // Load tokens on component mount
  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching all tokens...');
        const tokens = await fetchAllTokens();
        console.log('Tokens fetched:', Object.keys(tokens).map(chainId => 
          `Chain ${chainId}: ${tokens[Number(chainId)]?.length || 0} tokens`
        ));
        
        // Ensure each chain has at least the default tokens
        const ensuredTokens: Record<number, TokenInfo[]> = { ...tokens };
        
        Object.keys(defaultTokensByChain).forEach(chainIdStr => {
          const chainId = Number(chainIdStr);
          if (!ensuredTokens[chainId] || ensuredTokens[chainId].length === 0) {
            console.log(`Adding default tokens for chain ${chainId}`);
            ensuredTokens[chainId] = defaultTokensByChain[chainId];
          }
        });
        
        // Create popular tokens lists
        const popular: Record<number, TokenInfo[]> = {};
        
        // Ethereum popular tokens
        popular[ChainId.ETHEREUM] = ensuredTokens[ChainId.ETHEREUM]
          ?.filter(token => ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'].includes(token.symbol))
          ?.slice(0, 10) || defaultTokensByChain[ChainId.ETHEREUM];
        
        // BNB Chain popular tokens
        popular[ChainId.BNB] = ensuredTokens[ChainId.BNB]
          ?.filter(token => ['BNB', 'WBNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTCB', 'DOT', 'ADA', 'XRP'].includes(token.symbol))
          ?.slice(0, 10) || defaultTokensByChain[ChainId.BNB];
        
        // Solana popular tokens
        popular[ChainId.SOLANA] = ensuredTokens[ChainId.SOLANA]
          ?.filter(token => ['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'JUP', 'RAY', 'ORCA', 'MNGO'].includes(token.symbol))
          ?.slice(0, 10) || defaultTokensByChain[ChainId.SOLANA];
        
        // Ensure no tokens have empty addresses
        Object.keys(ensuredTokens).forEach(chainIdStr => {
          const chainId = Number(chainIdStr) as ChainId;
          ensuredTokens[chainId] = ensuredTokens[chainId].map(token => {
            if (!token.address || token.address === '' || token.address === 'undefined') {
              return {
                ...token,
                address: `generated-${token.symbol}-${Math.random().toString(36).substring(2, 15)}`
              };
            }
            return token;
          });
        });
        
        setAllTokens(ensuredTokens);
        setPopularTokens(popular);
      } catch (error) {
        console.error('Error loading tokens:', error);
        setError('Failed to load token list');
        toast({
          title: "Failed to load tokens",
          description: "Using fallback token lists. Some features may be limited.",
          variant: "default" // Changed from "warning" to "default" to fix the TypeScript error
        });
        
        // Use default tokens as fallback
        const fallbackTokens: Record<number, TokenInfo[]> = { ...defaultTokensByChain };
        setAllTokens(fallbackTokens);
        
        // Set popular tokens as the defaults too
        const fallbackPopular: Record<number, TokenInfo[]> = {};
        Object.keys(defaultTokensByChain).forEach(chainIdStr => {
          const chainId = Number(chainIdStr);
          fallbackPopular[chainId] = defaultTokensByChain[chainId];
        });
        setPopularTokens(fallbackPopular);
      } finally {
        setLoading(false);
      }
    }

    loadTokens();
  }, [toast]);

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
      commonSymbols.includes(token.symbol)
    );
    
    console.log(`Found ${filteredTokens.length} quote tokens`);
    
    // If no filtered tokens, return some default ones based on chain
    if (filteredTokens.length === 0) {
      console.log('Using default quote tokens');
      return defaultTokensByChain[selectedChain] || [];
    }
    
    return filteredTokens;
  }, [allTokens, selectedChain, commonQuoteTokens]);

  // Get chain tokens
  const getChainTokens = useCallback((): TokenInfo[] => {
    const tokens = allTokens[selectedChain] || [];
    console.log(`Getting all tokens for chain ${selectedChain}. Available tokens: ${tokens.length}`);
    
    // If no tokens available, return defaults
    if (tokens.length === 0) {
      console.log('Using default tokens for chain');
      return defaultTokensByChain[selectedChain] || [];
    }
    
    return tokens;
  }, [allTokens, selectedChain]);

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
    getChainTokens
  };
};
