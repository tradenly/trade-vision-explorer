
import React, { useState } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity, scanForArbitrageOpportunities } from '@/services/dexService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Loader2, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { executeTrade } from '@/services/dexService';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';

interface ArbitrageScannerProps {
  selectedToken: TokenInfo | null;
  quoteToken?: TokenInfo;
  investmentAmount?: number;
}

const ArbitrageScanner: React.FC<ArbitrageScannerProps> = ({
  selectedToken,
  quoteToken,
  investmentAmount = 1000
}) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const { toast } = useToast();
  const { isConnected: isEVMConnected, address: evmAddress } = useEthereumWallet();
  const { isConnected: isSolanaConnected, address: solanaAddress } = useSolanaWallet();

  const handleScan = async () => {
    if (!selectedToken) {
      toast({
        title: "No token selected",
        description: "Please select a token to scan for arbitrage opportunities",
        variant: "destructive"
      });
      return;
    }
    
    // Default quote token based on chain if not provided
    const defaultQuoteToken: TokenInfo = {
      name: selectedToken.chainId === 101 ? 'USDC' : 'USDT',
      symbol: selectedToken.chainId === 101 ? 'USDC' : 'USDT',
      address: '0x00',
      chainId: selectedToken.chainId,
      decimals: 6
    };
    
    setLoading(true);
    try {
      const results = await scanForArbitrageOpportunities(
        selectedToken,
        quoteToken || defaultQuoteToken,
        investmentAmount
      );
      
      setOpportunities(results);
      
      if (results.length === 0) {
        toast({
          title: "No opportunities found",
          description: "Try a different token or check again later",
        });
      } else {
        toast({
          title: `Found ${results.length} opportunities`,
          description: "Review the arbitrage opportunities below",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error during scan:', error);
      toast({
        title: "Scan failed",
        description: "There was an error during the scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteClick = (opportunity: ArbitrageOpportunity) => {
    // Check if wallet is connected for the right chain
    const isCorrectWalletConnected = 
      (opportunity.network === 'ethereum' || opportunity.network === 'bnb') ? isEVMConnected : 
      (opportunity.network === 'solana') ? isSolanaConnected : false;

    if (!isCorrectWalletConnected) {
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
        toast({
          title: "Trade successful",
          description: `Successfully executed arbitrage trade for ${selectedOpportunity.tokenPair}`,
          variant: "default",
        });
      } else {
        setTransactionStatus('error');
        toast({
          title: "Trade failed",
          description: result.error || "There was an error executing the trade",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      setTransactionStatus('error');
      toast({
        title: "Trade failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setExecuting(null);
        setTransactionStatus(null);
        setShowConfirmDialog(false);
      }, 3000); // Close dialog after showing status for 3 seconds
    }
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Arbitrage Scanner</CardTitle>
          <Button 
            onClick={handleScan} 
            disabled={!selectedToken || loading}
            className="ml-2"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan for Opportunities
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedToken ? (
          <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <p>Scanning for arbitrage opportunities with {selectedToken.symbol} ({selectedToken.name})</p>
            <p className="text-sm text-muted-foreground">Investment amount: ${investmentAmount.toLocaleString()}</p>
          </div>
        ) : (
          <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p>Select a token from the dropdown above to scan for arbitrage opportunities</p>
          </div>
        )}

        {opportunities.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token Pair</TableHead>
                  <TableHead>Buy On</TableHead>
                  <TableHead>Sell On</TableHead>
                  <TableHead>Buy Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Est. Profit</TableHead>
                  <TableHead>ROI %</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.tokenPair}</TableCell>
                    <TableCell>{op.buyDex}</TableCell>
                    <TableCell>{op.sellDex}</TableCell>
                    <TableCell>${op.buyPrice.toFixed(4)}</TableCell>
                    <TableCell>${op.sellPrice.toFixed(4)}</TableCell>
                    <TableCell>${(op.gasFee + op.tradingFees).toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-green-600 dark:text-green-400">
                      ${op.estimatedProfit.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {op.estimatedProfitPercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className="capitalize">{op.network}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleExecuteClick(op)}
                        disabled={executing === op.id}
                        className="whitespace-nowrap"
                      >
                        {executing === op.id ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="mr-1 h-3 w-3" /> 
                            Execute Trade
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No arbitrage opportunities found. Click "Scan for Opportunities" to start scanning.
          </div>
        )}
      </CardContent>

      {/* Trade Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => !executing && setShowConfirmDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Arbitrage Trade</DialogTitle>
            <DialogDescription>
              Review the details of this arbitrage opportunity before executing the trade.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOpportunity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 py-2">
                <span className="font-medium">Token Pair:</span>
                <span>{selectedOpportunity.tokenPair}</span>
                
                <span className="font-medium">Buy On:</span>
                <span>{selectedOpportunity.buyDex} (${selectedOpportunity.buyPrice.toFixed(4)})</span>
                
                <span className="font-medium">Sell On:</span>
                <span>{selectedOpportunity.sellDex} (${selectedOpportunity.sellPrice.toFixed(4)})</span>
                
                <span className="font-medium">Network:</span>
                <span className="capitalize">{selectedOpportunity.network}</span>
                
                <span className="font-medium">Gas Fee:</span>
                <span>${selectedOpportunity.gasFee.toFixed(4)}</span>
                
                <span className="font-medium">Trading Fees:</span>
                <span>${selectedOpportunity.tradingFees.toFixed(4)}</span>
                
                <span className="font-medium">Expected Profit:</span>
                <span className="text-green-600 font-bold">${selectedOpportunity.estimatedProfit.toFixed(4)} ({selectedOpportunity.estimatedProfitPercentage.toFixed(2)}%)</span>
              </div>

              {transactionStatus === 'pending' && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <AlertTitle>Processing transaction</AlertTitle>
                  <AlertDescription>Please wait while the trade is being executed...</AlertDescription>
                </Alert>
              )}

              {transactionStatus === 'success' && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>The trade has been successfully executed.</AlertDescription>
                </Alert>
              )}

              {transactionStatus === 'error' && (
                <Alert className="bg-red-50 border-red-200 text-red-800">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>Failed to execute the trade. Please try again.</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={!!executing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmTrade} disabled={!!executing || !selectedOpportunity}>
              {executing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Execute Trade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ArbitrageScanner;
