
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
import DexRegistry from '@/services/dex/DexRegistry';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

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
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [tempSettings, setTempSettings] = useState<ScanSettings>({
    profit_threshold: 0.5,
    gas_fee_threshold: 5.0,
    scan_interval: 30
  });
  const [dexCount, setDexCount] = useState<number>(0);
  const [networkName, setNetworkName] = useState<string>('ethereum');
  
  const { isConnected: isEVMConnected, address: evmAddress } = useEthereumWallet();
  const { isConnected: isSolanaConnected, address: solanaAddress } = useSolanaWallet();
  const { toast } = useToast();

  const getNetworkFromChainId = (chainId: ChainId): string => {
    switch (chainId) {
      case 1:
        return 'ethereum';
      case 56:
        return 'bnb';
      case 101:
        return 'solana';
      case 137:
        return 'polygon';
      case 42161:
        return 'arbitrum';
      case 10:
        return 'optimism';
      case 8453:
        return 'base';
      default:
        return 'unknown';
    }
  };

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
          setTempSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch scan settings:', err);
      }
    };
    
    fetchScanSettings();
  }, []);

  useEffect(() => {
    if (selectedChain) {
      const network = getNetworkFromChainId(selectedChain);
      setNetworkName(network);
      
      try {
        const dexRegistry = DexRegistry.getInstance();
        const adapters = dexRegistry.getAdaptersForChain(selectedChain);
        setDexCount(adapters.length);
      } catch (error) {
        console.error('Error getting DEX adapters:', error);
        setDexCount(0);
      }
    }
  }, [selectedChain]);

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
    
    const network = getNetworkFromChainId(chainId);
    setNetworkName(network);
    
    try {
      const dexRegistry = DexRegistry.getInstance();
      const adapters = dexRegistry.getAdaptersForChain(chainId);
      setDexCount(adapters.length);
    } catch (error) {
      console.error('Error getting DEX adapters:', error);
      setDexCount(0);
    }
    
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
        toast({
          title: "No opportunities found",
          description: "Try a different token pair or check again later.",
          variant: "default"
        });
        setScanError("No opportunities found. Try a different token pair or check again later.");
      } else {
        toast({
          title: `Found ${results.length} opportunities`,
          description: `Displaying arbitrage opportunities for ${baseToken.symbol}/${quoteToken.symbol}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error during scan:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setScanError(`Scan failed: ${errorMessage}`);
      
      toast({
        title: "Scan failed",
        description: errorMessage,
        variant: "destructive"
      });
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
      
      toast({
        title: "Wallet not connected",
        description: `Please connect your ${opportunity.network === 'solana' ? 'Solana' : 'EVM'} wallet to execute this trade`,
        variant: "destructive"
      });
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
        toast({
          title: "Trade executed successfully",
          description: `Transaction hash: ${result.txHash?.substring(0, 10)}...`,
          variant: "default"
        });
      } else {
        setTransactionStatus('error');
        setScanError(result.error || "There was an error executing the trade");
        toast({
          title: "Trade execution failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setTransactionStatus('error');
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setScanError(errorMessage);
      toast({
        title: "Trade execution failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setExecuting(null);
        setTransactionStatus(null);
        setShowConfirmDialog(false);
      }, 3000);
    }
  };

  const openSettingsDialog = () => {
    setTempSettings({...scanSettings});
    setShowSettingsDialog(true);
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from('scan_settings')
        .update({
          profit_threshold: tempSettings.profit_threshold,
          gas_fee_threshold: tempSettings.gas_fee_threshold,
          scan_interval: tempSettings.scan_interval
        })
        .eq('id', 1);
      
      if (error) throw error;
      
      setScanSettings(tempSettings);
      setShowSettingsDialog(false);
      
      toast({
        title: "Settings updated",
        description: "Arbitrage scan settings have been updated",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: "Failed to update arbitrage scan settings",
        variant: "destructive"
      });
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
          onOpenSettings={openSettingsDialog}
          network={networkName}
          dexCount={dexCount}
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
        
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <div className="text-lg font-semibold">Arbitrage Scan Settings</div>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div>Profit Threshold ({tempSettings.profit_threshold}%)</div>
                <div className="flex items-center gap-2">
                  <Slider 
                    defaultValue={[tempSettings.profit_threshold]}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onValueChange={([value]) => setTempSettings({...tempSettings, profit_threshold: value})}
                  />
                  <Input 
                    type="number" 
                    value={tempSettings.profit_threshold}
                    onChange={(e) => setTempSettings({...tempSettings, profit_threshold: parseFloat(e.target.value)})}
                    className="w-20"
                    step={0.1}
                    min={0.1}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div>Gas Fee Threshold (${tempSettings.gas_fee_threshold})</div>
                <div className="flex items-center gap-2">
                  <Slider 
                    defaultValue={[tempSettings.gas_fee_threshold]}
                    min={1}
                    max={50}
                    step={0.5}
                    onValueChange={([value]) => setTempSettings({...tempSettings, gas_fee_threshold: value})}
                  />
                  <Input 
                    type="number" 
                    value={tempSettings.gas_fee_threshold}
                    onChange={(e) => setTempSettings({...tempSettings, gas_fee_threshold: parseFloat(e.target.value)})}
                    className="w-20"
                    step={0.5}
                    min={1}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div>Scan Interval ({tempSettings.scan_interval} seconds)</div>
                <div className="flex items-center gap-2">
                  <Slider 
                    defaultValue={[tempSettings.scan_interval]}
                    min={5}
                    max={120}
                    step={5}
                    onValueChange={([value]) => setTempSettings({...tempSettings, scan_interval: value})}
                  />
                  <Input 
                    type="number" 
                    value={tempSettings.scan_interval}
                    onChange={(e) => setTempSettings({...tempSettings, scan_interval: parseInt(e.target.value)})}
                    className="w-20"
                    step={5}
                    min={5}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
              <Button onClick={saveSettings}>Save Settings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ArbitrageScanner;
