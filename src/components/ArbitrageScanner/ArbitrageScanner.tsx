
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArbitrageOpportunity } from '@/services/dexService';
import { useToast } from '@/hooks/use-toast';
import { TransactionStatus } from '@/services/dex/types';
import { TokenInfo } from '@/services/tokenListService';
import { ChainId } from '@/services/tokenListService';
import { useArbitrageScanner } from '@/hooks/useArbitrageScanner';
import { ScannerHeader } from './ScannerHeader';
import { ScannerContent } from './ScannerContent';
import TradeConfirmDialog from './TradeConfirmDialog';

const ArbitrageScanner: React.FC = () => {
  const { toast } = useToast();
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [minProfitPercentage, setMinProfitPercentage] = useState(0.5);
  const [autoScan, setAutoScan] = useState(false);

  const { 
    opportunities, 
    loading, 
    error, 
    scanForOpportunities, 
    lastScanTime 
  } = useArbitrageScanner(baseToken, quoteToken, investmentAmount, minProfitPercentage, autoScan);

  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    setBaseToken(base);
    setQuoteToken(quote);
  };

  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    setBaseToken(null);
    setQuoteToken(null);
  };

  const handleScan = () => {
    if (!baseToken || !quoteToken) {
      toast({
        title: "Error",
        description: "Please select both base and quote tokens",
        variant: "destructive"
      });
      return;
    }
    scanForOpportunities();
  };

  const handleOpportunitySelect = (opportunity: ArbitrageOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  };

  const handleExecuteTrade = async () => {
    if (!selectedOpportunity) return;

    setExecuting(selectedOpportunity.id);
    setTransactionStatus(TransactionStatus.PENDING);

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      setTransactionStatus(TransactionStatus.SUCCESS);
      toast({
        title: "Trade Executed",
        description: `Successfully executed arbitrage trade with ${selectedOpportunity.estimatedProfit.toFixed(2)} profit`,
      });
    } catch (err) {
      console.error('Error executing trade:', err);
      setTransactionStatus(TransactionStatus.ERROR);
      toast({
        title: "Trade Failed",
        description: "Failed to execute arbitrage trade",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setExecuting(null);
        setDialogOpen(false);
        setTransactionStatus(TransactionStatus.IDLE);
        scanForOpportunities();
      }, 2000);
    }
  };

  return (
    <div className="container mx-auto">
      <Card>
        <ScannerHeader />
        <ScannerContent
          baseToken={baseToken}
          quoteToken={quoteToken}
          loading={loading}
          error={error}
          opportunities={opportunities}
          lastScanTime={lastScanTime}
          selectedChain={selectedChain}
          investmentAmount={investmentAmount}
          onTokenPairSelect={handleTokenPairSelect}
          onChainChange={handleChainChange}
          onInvestmentAmountChange={setInvestmentAmount}
          onScan={handleScan}
          onOpportunitySelect={handleOpportunitySelect}
        />
      </Card>

      <TradeConfirmDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        opportunity={selectedOpportunity}
        onConfirm={handleExecuteTrade}
        executing={executing}
        transactionStatus={transactionStatus}
        investmentAmount={investmentAmount}
      />
    </div>
  );
};

export default ArbitrageScanner;
