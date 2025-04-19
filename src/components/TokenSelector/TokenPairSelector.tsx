
import React, { useState, useEffect } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import ChainSelector from './ChainSelector';
import TokenPairControls from './TokenPairControls';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTokensSimple } from '@/hooks/useTokensSimple';

interface TokenPairSelectorProps {
  onSelectTokenPair: (baseToken: TokenInfo, quoteToken: TokenInfo) => void;
  selectedChain: ChainId;
  onSelectChain: (chainId: ChainId) => void;
  investmentAmount?: number;
  onInvestmentAmountChange?: (amount: number) => void;
}

const TokenPairSelector: React.FC<TokenPairSelectorProps> = ({
  onSelectTokenPair,
  selectedChain,
  onSelectChain,
  investmentAmount = 1000,
  onInvestmentAmountChange = () => {}
}) => {
  const {
    loading,
    error,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange,
    ensureValidAddress
  } = useTokensSimple(selectedChain);

  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  
  // Handle chain change from props
  useEffect(() => {
    if (selectedChain) {
      handleChainChange(selectedChain);
      setBaseToken(null);
      setQuoteToken(null);
    }
  }, [selectedChain, handleChainChange]);

  const handleBaseTokenSelect = (token: TokenInfo) => {
    const validToken = ensureValidAddress(token);
    setBaseToken(validToken);
    
    if (quoteToken && validToken) {
      onSelectTokenPair(validToken, quoteToken);
    }
  };

  const handleQuoteTokenSelect = (token: TokenInfo) => {
    const validToken = ensureValidAddress(token);
    setQuoteToken(validToken);
    
    if (baseToken && validToken) {
      onSelectTokenPair(baseToken, validToken);
    }
  };

  const handleSwapTokens = () => {
    if (baseToken && quoteToken) {
      setBaseToken(quoteToken);
      setQuoteToken(baseToken);
      onSelectTokenPair(quoteToken, baseToken);
    }
  };

  const handleChainSelection = (chainId: ChainId) => {
    onSelectChain(chainId);
  };

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onInvestmentAmountChange(value);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <ChainSelector 
          selectedChain={selectedChain} 
          onChainChange={handleChainSelection} 
        />
        
        <TokenPairControls
          baseToken={baseToken}
          quoteToken={quoteToken}
          onBaseTokenSelect={handleBaseTokenSelect}
          onQuoteTokenSelect={handleQuoteTokenSelect}
          onSwapTokens={handleSwapTokens}
          popularTokens={popularTokens}
          quoteTokens={quoteTokens}
          allChainTokens={allChainTokens}
          loading={loading}
        />
        
        <div className="space-y-2">
          <Label id="investment-amount-label">Investment Amount ($)</Label>
          <Input
            id="investment-amount"
            aria-labelledby="investment-amount-label"
            type="number"
            min="1"
            step="10"
            value={investmentAmount}
            onChange={handleInvestmentChange}
            className="max-w-[200px]"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenPairSelector;
