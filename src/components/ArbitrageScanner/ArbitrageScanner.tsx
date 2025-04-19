
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ArbitrageOpportunity } from '@/services/dexService';
import { useToast } from '@/hooks/use-toast';
import { TransactionStatus } from '@/services/dex/types';
import { TokenInfo } from '@/services/tokenListService';
import { ChainId } from '@/services/tokenListService';
import { useArbitrageScanner, ScanOptions } from '@/hooks/useArbitrageScanner';
import { ScannerHeader } from './ScannerHeader';
import { ScannerContent } from './ScannerContent';
import TradeConfirmDialog from './TradeConfirmDialog';
import { useRealTimePrices } from '@/hooks/useRealTimePrices';
import { executeArbitrageTrade, useWalletForArbitrage } from '@/services/arbitrageExecutionService';

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

  // Create a proper ScanOptions object
  const scanOptions: ScanOptions = {
    minProfitPercentage: minProfitPercentage,
    maxSlippageTolerance: 2,
    minLiquidity: 10000
  };

  const { 
    opportunities, 
    loading, 
    error, 
    scanForOpportunities, 
    lastScanTime 
  } = useArbitrageScanner(baseToken, quoteToken, investmentAmount, scanOptions, autoScan);

  // Use our new real-time prices hook
  const { prices: realTimePrices, loading: pricesLoading } = useRealTimePrices(baseToken, quoteToken);
  
  // Get the appropriate wallet based on the network of selectedOpportunity
  const { address: walletAddress, isConnected } = useWalletForArbitrage(
    selectedOpportunity?.network || 'ethereum'
  );

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

    if (Object.keys(realTimePrices).length > 0) {
      console.log('Using real-time prices for scan:', realTimePrices);
    }
    
    scanForOpportunities();
  };

  const handleOpportunitySelect = (opportunity: ArbitrageOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  };

  const handleExecuteTrade = async () => {
    if (!selectedOpportunity) return;
    
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: `Please connect your ${selectedOpportunity.network === 'solana' ? 'Solana' : 'EVM'} wallet first`,
        variant: "destructive"
      });
      setDialogOpen(false);
      return;
    }

    setExecuting(selectedOpportunity.id);
    setTransactionStatus(TransactionStatus.PENDING);

    try {
      const result = await executeArbitrageTrade(
        selectedOpportunity,
        walletAddress!,
        investmentAmount
      );
      
      setTransactionStatus(result.status);
      
      if (result.status === TransactionStatus.SUCCESS) {
        toast({
          title: "Trade Executed",
          description: `Successfully executed arbitrage trade with ${selectedOpportunity.netProfit.toFixed(2)} profit`,
        });
      } else if (result.status === TransactionStatus.NEEDS_APPROVAL) {
        toast({
          title: "Token Approval Required",
          description: "Please approve token spending before executing this trade",
        });
      } else {
        toast({
          title: "Trade Failed",
          description: result.error || "Failed to execute arbitrage trade",
          variant: "destructive"
        });
      }
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
        // Only close dialog on success or error, not on "needs approval"
        if (transactionStatus !== TransactionStatus.NEEDS_APPROVAL) {
          setExecuting(null);
          setDialogOpen(false);
          setTransactionStatus(TransactionStatus.IDLE);
          scanForOpportunities();
        }
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
          loading={loading || pricesLoading}
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
          realTimePrices={realTimePrices}
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
