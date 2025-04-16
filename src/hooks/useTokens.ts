
import { useState, useEffect } from 'react';
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
        const tokens = await fetchAllTokens();
        
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
  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    // Reset token selections when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  };

  // Get filtered quote tokens for the selected chain
  const getQuoteTokens = (): TokenInfo[] => {
    const chainTokens = allTokens[selectedChain] || [];
    const commonSymbols = commonQuoteTokens[selectedChain] || [];
    return chainTokens.filter(token => commonSymbols.includes(token.symbol));
  };

  // Get chain tokens
  const getChainTokens = (): TokenInfo[] => {
    return allTokens[selectedChain] || [];
  };

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
