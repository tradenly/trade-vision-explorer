
import React, { useState, useEffect } from 'react';
import { TokenInfo, ChainId } from '@/services/tokenListService';
import { ArbitrageOpportunity, scanForArbitrageOpportunities, executeTrade } from '@/services/dexService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';
import TokenPairSelectorNew from '../TokenSelector/TokenPairSelectorNew';
import OpportunityTable from './OpportunityTable';
import TradeConfirmDialog from './TradeConfirmDialog';
import ScanControls from './ScanControls';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';

interface ArbitrageScannerProps {
  initialBaseToken?: TokenInfo | null;
  initialQuoteToken?: TokenInfo | null;
  investmentAmount?: number;
  onTokenPairSelect?: (base: TokenInfo, quote: TokenInfo) => void;
  onInvestmentAmountChange?: (amount: number) => void;
  onChainSelect?: (chainId: ChainId) => void;
  selectedChain?: ChainId;
}

interface ScanSettings {
  profit_threshold: number;
  gas_fee_threshold: number;
  scan_interval: number;
}

const ArbitrageScanner: React.FC<ArbitrageScannerProps> = ({
  initialBaseToken,
  initialQuoteToken,
  investmentAmount = 1000,
  onTokenPairSelect,
  onInvestmentAmountChange,
  onChainSelect,
  selectedChain = ChainId.ETHEREUM
}) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(initialBaseToken || null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(initialQuoteToken || null);
  const [amount, setAmount] = useState<number>(investmentAmount);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSettings, setScanSettings] = useState<ScanSettings>({
    profit_threshold: 0.5,
    gas_fee_threshold: 5.0,
    scan_interval: 30
  });
  
  const { isConnected: isEVMConnected, address: evmAddress } = useEthereumWallet();
  const { isConnected: isSolanaConnected, address: solanaAddress } = useSolanaWallet();

  // Fetch scan settings on component mount
  useEffect(() => {
    const fetchScanSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('scan_settings')
          .select('*')
          .single();
        
        if (error) {
          console.error('Error fetching scan settings:', error);
        } else if (data) {
          setScanSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch scan settings:', err);
      }
    };
    
    fetchScanSettings();
  }, []);

  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    console.log("Token pair selected:", base.symbol, quote.symbol);
    setScanError(null);
    setBaseToken(base);
    setQuoteToken(quote);
    setOpportunities([]);
    
    if (onTokenPairSelect) {
      onTokenPairSelect(base, quote);
    }
  };

  const handleAmountChange = (newAmount: number) => {
    setAmount(newAmount);
    
    if (onInvestmentAmountChange) {
      onInvestmentAmountChange(newAmount);
    }
  };

  const handleChainSelect = (chainId: ChainId) => {
    setOpportunities([]);
    setScanError(null);
    
    if (onChainSelect) {
      onChainSelect(chainId);
    }
  };

  const handleScan = async () => {
    if (!baseToken || !quoteToken) {
      setScanError("Please select both base and quote tokens to scan");
      return;
    }
    
    setLoading(true);
    setScanError(null);
    
    try {
      console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} with $${amount}`);
      
      const results = await scanForArbitrageOpportunities(
        baseToken,
        quoteToken,
        amount,
        scanSettings.profit_threshold
      );
      
      setOpportunities(results);
      
      if (results.length === 0) {
        console.log("No arbitrage opportunities found");
        setScanError("No opportunities found. Try a different token pair or check again later.");
      }
    } catch (error) {
      console.error('Error during scan:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setScanError(`Scan failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteClick = (opportunity: ArbitrageOpportunity) => {
    const isCorrectWalletConnected = 
      (opportunity.network === 'ethereum' || opportunity.network === 'bnb' || 
       opportunity.network === 'polygon' || opportunity.network === 'base' || 
       opportunity.network === 'arbitrum' || opportunity.network === 'optimism') ? isEVMConnected : 
      (opportunity.network === 'solana') ? isSolanaConnected : false;

    if (!isCorrectWalletConnected) {
      setScanError(`Please connect your ${opportunity.network === 'solana' ? 'Solana' : 'EVM'} wallet to execute this trade`);
      return;
    }

    setSelectedOpportunity(opportunity);
    setShowConfirmDialog(true);
  };

  const handleConfirmTrade = async () => {
    if (!selectedOpportunity) return;
    
    setExecuting(selectedOpportunity.id);
    setTransactionStatus('pending');
    
    try {
      const walletAddress = selectedOpportunity.network === 'solana' ? solanaAddress : evmAddress;
      
      if (!walletAddress) {
        throw new Error('Wallet address not found');
      }
      
      const result = await executeTrade(selectedOpportunity, walletAddress);
      
      if (result.success) {
        setTransactionStatus('success');
        setScanError(null);
      } else {
        setTransactionStatus('error');
        setScanError(result.error || "There was an error executing the trade");
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setTransactionStatus('error');
      setScanError(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setTimeout(() => {
        setExecuting(null);
        setTransactionStatus(null);
        setShowConfirmDialog(false);
      }, 3000);
    }
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Arbitrage Scanner</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <TokenPairSelectorNew 
          onSelectTokenPair={handleTokenPairSelect}
          investmentAmount={amount}
          onInvestmentAmountChange={handleAmountChange}
          selectedChain={selectedChain}
          onSelectChain={handleChainSelect}
        />
        
        <Separator />
        
        <ScanControls 
          baseToken={baseToken} 
          quoteToken={quoteToken}
          onScan={handleScan}
          loading={loading}
          scanError={scanError}
          profitThreshold={scanSettings.profit_threshold}
        />
        
        <OpportunityTable 
          opportunities={opportunities}
          loading={loading}
          executing={executing}
          onExecuteClick={handleExecuteClick}
          baseToken={baseToken?.symbol || null}
          quoteToken={quoteToken?.symbol || null}
          investmentAmount={amount}
        />

        <TradeConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          opportunity={selectedOpportunity}
          onConfirm={handleConfirmTrade}
          executing={executing}
          transactionStatus={transactionStatus}
          investmentAmount={amount}
        />
      </CardContent>
    </Card>
  );
};

export default ArbitrageScanner;
