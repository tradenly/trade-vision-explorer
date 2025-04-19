
import React, { useState, useEffect } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTokensSimple } from '@/hooks/useTokensSimple';
import ChainSelector from './ChainSelector';
import TokenPairControls from './TokenPairControls';
import InvestmentAmountInput from './InvestmentAmountInput';
import TokenPairDisplay from './TokenPairDisplay';

interface TokenPairSelectorProps {
  onSelectTokenPair: (baseToken: TokenInfo, quoteToken: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  investmentAmount?: number;
  onInvestmentAmountChange?: (amount: number) => void;
}

const TokenPairSelectorNew: React.FC<TokenPairSelectorProps> = ({ 
  onSelectTokenPair, 
  selectedChain = ChainId.ETHEREUM,
  onSelectChain,
  investmentAmount = 1000,
  onInvestmentAmountChange
}) => {
  const {
    loading,
    error,
    selectedChain: hookSelectedChain,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange: hookHandleChainChange,
    ensureValidAddress,
  } = useTokensSimple(selectedChain);
  
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  
  useEffect(() => {
    // Reset tokens when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  }, [hookSelectedChain]);
  
  const handleChainChange = (chainId: ChainId) => {
    try {
      hookHandleChainChange(chainId);
      if (onSelectChain) {
        onSelectChain(chainId);
      }
    } catch (error) {
      console.error('Error changing chain:', error);
    }
  };
  
  useEffect(() => {
    if (baseToken && quoteToken) {
      try {
        onSelectTokenPair(baseToken, quoteToken);
      } catch (error) {
        console.error('Error in onSelectTokenPair:', error);
      }
    }
  }, [baseToken, quoteToken, onSelectTokenPair]);
  
  const handleBaseTokenSelect = (token: TokenInfo) => {
    if (!token) return;
    try {
      const validToken = ensureValidAddress(token);
      setBaseToken(validToken);
    } catch (error) {
      console.error('Error selecting base token:', error);
    }
  };
  
  const handleQuoteTokenSelect = (token: TokenInfo) => {
    if (!token) return;
    try {
      const validToken = ensureValidAddress(token);
      setQuoteToken(validToken);
    } catch (error) {
      console.error('Error selecting quote token:', error);
    }
  };
  
  const handleSwapTokens = () => {
    if (baseToken && quoteToken) {
      try {
        const temp = baseToken;
        setBaseToken(quoteToken);
        setQuoteToken(temp);
      } catch (error) {
        console.error('Error swapping tokens:', error);
      }
    }
  };
  
  const handleInvestmentAmountChange = (amount: number) => {
    try {
      if (onInvestmentAmountChange) {
        onInvestmentAmountChange(amount);
      }
    } catch (error) {
      console.error('Error changing investment amount:', error);
    }
  };

  // Make sure we have default tokens loaded even if API fails
  const effectivePopularTokens = popularTokens.length > 0 ? popularTokens : [];
  const effectiveQuoteTokens = quoteTokens.length > 0 ? quoteTokens : [];
  const effectiveAllTokens = allChainTokens.length > 0 ? allChainTokens : [];
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Select Token Pair</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChainSelector
          selectedChain={hookSelectedChain}
          onChainChange={handleChainChange}
        />
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Using fallback token list.
            </AlertDescription>
          </Alert>
        )}

        <TokenPairControls
          baseToken={baseToken}
          quoteToken={quoteToken}
          onBaseTokenSelect={handleBaseTokenSelect}
          onQuoteTokenSelect={handleQuoteTokenSelect}
          onSwapTokens={handleSwapTokens}
          popularTokens={effectivePopularTokens}
          quoteTokens={effectiveQuoteTokens}
          allChainTokens={effectiveAllTokens}
          loading={loading}
        />

        <InvestmentAmountInput
          amount={investmentAmount}
          onChange={handleInvestmentAmountChange}
        />
      </CardContent>
      <CardFooter>
        <div className="w-full">
          <TokenPairDisplay
            baseToken={baseToken}
            quoteToken={quoteToken}
          />
        </div>
      </CardFooter>
    </Card>
  );
};

export default TokenPairSelectorNew;
