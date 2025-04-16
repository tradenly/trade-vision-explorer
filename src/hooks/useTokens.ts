
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
        
        // Create popular tokens lists
        const popular: Record<number, TokenInfo[]> = {};
        
        // Ethereum popular tokens
        popular[ChainId.ETHEREUM] = tokens[ChainId.ETHEREUM]
          ?.filter(token => ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        // BNB Chain popular tokens
        popular[ChainId.BNB] = tokens[ChainId.BNB]
          ?.filter(token => ['BNB', 'WBNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTCB', 'DOT', 'ADA', 'XRP'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        // Solana popular tokens
        popular[ChainId.SOLANA] = tokens[ChainId.SOLANA]
          ?.filter(token => ['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'JUP', 'RAY', 'ORCA', 'MNGO'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        // Check if any chains have empty token lists
        const chainWithEmptyTokens = Object.entries(tokens).find(([chainId, tokenList]) => 
          !tokenList || tokenList.length === 0
        );

        if (chainWithEmptyTokens) {
          console.warn(`Chain ${chainWithEmptyTokens[0]} has no tokens`);
        }

        // If Ethereum tokens are empty, add some default tokens
        if (!tokens[ChainId.ETHEREUM] || tokens[ChainId.ETHEREUM].length === 0) {
          console.log('Adding fallback Ethereum tokens');
          tokens[ChainId.ETHEREUM] = [
            { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
            { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
            { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
            { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
            { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
          ];
          
          // Update popular tokens for Ethereum
          popular[ChainId.ETHEREUM] = tokens[ChainId.ETHEREUM];
        }

        // Ensure no tokens have empty addresses
        Object.keys(tokens).forEach(chainIdStr => {
          const chainId = Number(chainIdStr) as ChainId;
          tokens[chainId] = tokens[chainId].map(token => {
            if (!token.address || token.address === '') {
              return {
                ...token,
                address: `generated-${token.symbol}-${Math.random().toString(36).substring(2, 15)}`
              };
            }
            return token;
          });
        });
        
        setAllTokens(tokens);
        setPopularTokens(popular);
      } catch (error) {
        console.error('Error loading tokens:', error);
        setError('Failed to load token list');
        toast({
          title: "Failed to load tokens",
          description: "Could not fetch token list. Please try again later.",
          variant: "destructive"
        });
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
    if (filteredTokens.length === 0 && chainTokens.length > 0) {
      console.log('Using first 5 available tokens as quote tokens');
      return chainTokens.slice(0, 5);
    }
    
    return filteredTokens;
  }, [allTokens, selectedChain, commonQuoteTokens]);

  // Get chain tokens
  const getChainTokens = useCallback((): TokenInfo[] => {
    const tokens = allTokens[selectedChain] || [];
    console.log(`Getting all tokens for chain ${selectedChain}. Available tokens: ${tokens.length}`);
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
