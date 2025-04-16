
import React, { useState } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import ArbitrageScanner from '@/components/ArbitrageScanner/ArbitrageScanner';
import PriceChart from '@/components/PriceChart/PriceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletSection from '@/components/WalletConnect/WalletSection';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ArbitrageAnalysis = () => {
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);

  // Handle token pair selection from child components
  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    try {
      setBaseToken(base);
      setQuoteToken(quote);
      console.log('Selected tokens:', base.symbol, quote.symbol);
      // Toast notifications removed
    } catch (error) {
      console.error('Error selecting token pair:', error);
      // Toast error notification removed
    }
  };

  // Handle investment amount changes
  const handleInvestmentAmountChange = (amount: number) => {
    setInvestmentAmount(amount);
  };

  // Handle chain selection change
  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    // Reset tokens when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Arbitrage Analysis</h1>
        <Link to="/settings">
          <Button variant="outline" className="flex gap-2 items-center">
            <Settings size={16} />
            Settings
          </Button>
        </Link>
      </div>
      
      {/* Wallet Connection Section */}
      <WalletSection />
      
      {/* ArbitrageScanner with TokenPairSelector integrated */}
      <ArbitrageScanner 
        initialBaseToken={baseToken}
        initialQuoteToken={quoteToken}
        investmentAmount={investmentAmount}
        onTokenPairSelect={handleTokenPairSelect}
        onInvestmentAmountChange={handleInvestmentAmountChange}
        onChainSelect={handleChainChange}
        selectedChain={selectedChain}
      />
      
      {/* Price Chart Component - will use the selected tokens */}
      {baseToken && quoteToken && (
        <PriceChart 
          baseToken={baseToken} 
          quoteToken={quoteToken}
        />
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>About Arbitrage Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Select a token pair and investment amount above to scan for arbitrage opportunities across different exchanges.
            The scanner will analyze price differences between exchanges and show potential profit after accounting for fees.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArbitrageAnalysis;
