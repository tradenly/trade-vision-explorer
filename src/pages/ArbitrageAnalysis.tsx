
import React, { useState, useEffect } from 'react';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import ArbitrageScanner from '@/components/ArbitrageScanner/ArbitrageScanner';
import PriceChart from '@/components/PriceChart/PriceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletSection from '@/components/WalletConnect/WalletSection';
import { Link } from 'react-router-dom';
import { Settings, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TokenPairSelectorNew from '@/components/TokenSelector/TokenPairSelectorNew';
import { useTokensSimple } from '@/hooks/useTokensSimple';

const ArbitrageAnalysis = () => {
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  
  // Initial token data load to ensure we have tokens ready for the selector
  const { loading: tokensLoading } = useTokensSimple(selectedChain);

  // Handle token pair selection from child components
  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    try {
      setBaseToken(base);
      setQuoteToken(quote);
      console.log('Selected tokens:', base.symbol, quote.symbol);
    } catch (error) {
      console.error('Error selecting token pair:', error);
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
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Arbitrage Analysis</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p>Scan for arbitrage opportunities across different DEXs and blockchains.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Link to="/settings">
          <Button variant="outline" className="flex gap-2 items-center">
            <Settings size={16} />
            Settings
          </Button>
        </Link>
      </div>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Connect your wallet to execute trades. Tradenly charges a 0.5% fee on profitable arbitrage trades.
        </AlertDescription>
      </Alert>
      
      {/* Wallet Connection Section */}
      <WalletSection />
      
      {/* Token pair selector */}
      <div className="mb-6">
        <TokenPairSelectorNew
          onSelectTokenPair={handleTokenPairSelect}
          selectedChain={selectedChain}
          onSelectChain={handleChainChange}
          investmentAmount={investmentAmount}
          onInvestmentAmountChange={handleInvestmentAmountChange}
        />
      </div>
      
      {/* ArbitrageScanner */}
      <ArbitrageScanner />
      
      {baseToken && quoteToken && (
        <>
          <Separator className="my-4" />
          <h2 className="text-2xl font-bold mb-4">Price Chart</h2>
          {/* Price Chart Component - will use the selected tokens */}
          <PriceChart 
            baseToken={baseToken} 
            quoteToken={quoteToken}
          />
        </>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How Arbitrage Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Arbitrage trading takes advantage of price differences between exchanges. When the same token 
            is priced differently on two exchanges, you can buy at the lower price and sell at the higher price 
            for a profit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">The Process</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Select a token pair to analyze</li>
                <li>Our algorithm scans multiple DEXs to find price discrepancies</li>
                <li>Review the opportunities and their estimated profits</li>
                <li>Connect your wallet and execute the trade when ready</li>
              </ol>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Fees Included</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Trading fees from both buying and selling DEXs</li>
                <li>Network gas fees for transaction processing</li>
                <li>Tradenly platform fee (0.5% of investment amount)</li>
                <li>All fees are automatically calculated and subtracted</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArbitrageAnalysis;
