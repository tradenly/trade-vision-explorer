
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { useToast } from '@/hooks/use-toast';
import { TransactionStatus } from '@/services/dex/types';
import { TokenInfo } from '@/services/tokenListService';
import { ChainId } from '@/services/tokenListService';
import { useArbitrageScan } from '@/hooks/arbitrage/useArbitrageScan';
import { ScannerHeader } from './ScannerHeader';
import { ScannerContent } from './ScannerContent';
import TradeConfirmDialog from './TradeConfirmDialog';
import { useRealTimePrices } from '@/hooks/useRealTimePrices';
import { scanArbitrageOpportunities } from '@/services/arbitrageScanner';

// Mock function for wallet - in a real app this would be connected to MetaMask, Phantom, etc.
const useWallet = () => {
  return {
    address: '0x123...456',
    isConnected: true
  };
};

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
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Use our new real-time prices hook
  const { 
    prices: realTimePrices, 
    loading: pricesLoading, 
    refreshPrices 
  } = useRealTimePrices(baseToken, quoteToken);
  
  // Get the appropriate wallet
  const { address: walletAddress, isConnected } = useWallet();

  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    setBaseToken(base);
    setQuoteToken(quote);
  };

  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    setBaseToken(null);
    setQuoteToken(null);
    setOpportunities([]);
  };

  const handleScan = async () => {
    if (!baseToken || !quoteToken) {
      toast({
        title: "Error",
        description: "Please select both base and quote tokens",
        variant: "destructive"
      });
      return;
    }

    setScanLoading(true);
    setError(null);

    try {
      const result = await scanArbitrageOpportunities(
        baseToken,
        quoteToken,
        minProfitPercentage,
        investmentAmount
      );
      
      setOpportunities(result.opportunities);
      setLastScanTime(new Date());
      
      if (result.opportunities.length > 0) {
        toast({
          title: "Arbitrage Opportunities Found",
          description: `Found ${result.opportunities.length} profitable arbitrage opportunities.`,
        });
      } else {
        toast({
          title: "No Opportunities Found",
          description: "No profitable arbitrage opportunities found for the selected tokens.",
        });
      }
    } catch (err) {
      console.error("Error scanning for arbitrage:", err);
      setError(err instanceof Error ? err.message : "Failed to scan for arbitrage opportunities");
      toast({
        title: "Scanning Failed",
        description: err instanceof Error ? err.message : "Failed to scan for arbitrage opportunities",
        variant: "destructive"
      });
    } finally {
      setScanLoading(false);
    }
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
        description: "Please connect your wallet to execute trades",
        variant: "destructive"
      });
      setDialogOpen(false);
      return;
    }

    setExecuting(selectedOpportunity.id);
    setTransactionStatus(TransactionStatus.PENDING);

    try {
      // Simulate trade execution - in a real app this would call a contract
      setTimeout(() => {
        setTransactionStatus(TransactionStatus.SUCCESS);
        
        toast({
          title: "Trade Executed",
          description: `Successfully executed arbitrage trade with $${selectedOpportunity.netProfit.toFixed(2)} profit`,
        });
        
        setTimeout(() => {
          setExecuting(null);
          setDialogOpen(false);
          setTransactionStatus(TransactionStatus.IDLE);
          // Re-scan for new opportunities
          handleScan();
        }, 2000);
      }, 3000);
      
    } catch (err) {
      console.error('Error executing trade:', err);
      setTransactionStatus(TransactionStatus.ERROR);
      
      toast({
        title: "Trade Failed",
        description: "Failed to execute arbitrage trade",
        variant: "destructive"
      });
      
      setTimeout(() => {
        setExecuting(null);
        setTransactionStatus(TransactionStatus.IDLE);
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
          loading={scanLoading || pricesLoading}
          error={scanError}
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
          onRefreshPrices={refreshPrices}
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
