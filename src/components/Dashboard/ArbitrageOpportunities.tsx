
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCcw, ExternalLink } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { executeArbitrageTrade, useWalletForArbitrage } from '@/services/arbitrageExecutionService';
import { toast } from '@/hooks/use-toast';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Progress } from '@/components/ui/progress';
import { TransactionStatus } from '@/services/dex/types';
import { formatNumber, formatTokenPrice } from '@/lib/utils';

interface ArbitrageOpportunitiesProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  error: string | null;
  investmentAmount: number;
  onRefresh?: () => void;
  onInvestmentAmountChange?: (amount: number) => void;
}

const ArbitrageOpportunities: React.FC<ArbitrageOpportunitiesProps> = ({
  opportunities,
  loading,
  error,
  investmentAmount,
  onRefresh,
  onInvestmentAmountChange
}) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [executionProgress, setExecutionProgress] = useState(0);
  
  // Get wallet based on network 
  const { address: walletAddress, isConnected } = useWalletForArbitrage(
    selectedOpportunity?.network || 'ethereum'
  );

  const handleExecuteTrade = async () => {
    if (!selectedOpportunity || !isConnected || !walletAddress) {
      toast({
        title: "Cannot execute trade",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setExecuting(true);
    setTransactionStatus(TransactionStatus.PENDING);
    
    // Simulate trade progress
    const progressInterval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 500);

    try {
      const result = await executeArbitrageTrade(
        selectedOpportunity,
        walletAddress,
        investmentAmount
      );
      
      setTransactionStatus(result.status);
      
      if (result.status === TransactionStatus.SUCCESS) {
        setExecutionProgress(100);
        toast({
          title: "Trade executed successfully",
          description: `Profit: $${selectedOpportunity.netProfit.toFixed(2)}`,
        });
        
        // Refresh opportunities after successful execution
        if (onRefresh) {
          setTimeout(onRefresh, 2000);
        }
      } else {
        toast({
          title: "Trade execution failed",
          description: result.error || "An error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      setTransactionStatus(TransactionStatus.ERROR);
      toast({
        title: "Error executing trade",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setExecuting(false);
        if (transactionStatus === TransactionStatus.SUCCESS) {
          setExecuteDialogOpen(false);
        }
      }, 2000);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    if (!isNaN(amount) && amount > 0 && onInvestmentAmountChange) {
      onInvestmentAmountChange(amount);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Arbitrage Opportunities</CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Investment: $</span>
            <Input
              type="number"
              value={investmentAmount}
              onChange={handleAmountChange}
              className="w-24"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : opportunities.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Buy DEX</TableHead>
                <TableHead>Sell DEX</TableHead>
                <TableHead>Price Diff</TableHead>
                <TableHead>Est. Profit</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell>{opportunity.tokenPair}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{opportunity.network}</Badge>
                  </TableCell>
                  <TableCell>{opportunity.buyDex}</TableCell>
                  <TableCell>{opportunity.sellDex}</TableCell>
                  <TableCell className="text-green-600">
                    +{opportunity.priceDifferencePercentage.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      ${formatNumber(opportunity.netProfit)}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      ({opportunity.netProfitPercentage.toFixed(2)}%)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedOpportunity(opportunity);
                        setExecuteDialogOpen(true);
                      }}
                    >
                      Execute
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No arbitrage opportunities found at the moment.</p>
            <p className="text-sm">Try adjusting your investment amount or check back later.</p>
          </div>
        )}

        <Dialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Execute Arbitrage Trade</DialogTitle>
              <DialogDescription>
                Review and confirm this arbitrage opportunity
              </DialogDescription>
            </DialogHeader>

            {selectedOpportunity && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Token Pair</p>
                    <p className="font-medium">{selectedOpportunity.tokenPair}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Network</p>
                    <p className="font-medium">{selectedOpportunity.network}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Buy on</p>
                    <p className="font-medium">{selectedOpportunity.buyDex} @ ${formatTokenPrice(selectedOpportunity.buyPrice)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Sell on</p>
                    <p className="font-medium">{selectedOpportunity.sellDex} @ ${formatTokenPrice(selectedOpportunity.sellPrice)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Investment</p>
                    <p className="font-medium">${formatNumber(investmentAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Price Difference</p>
                    <p className="font-medium text-green-600">+{selectedOpportunity.priceDifferencePercentage.toFixed(2)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
                    <p className="font-medium text-amber-600">${formatNumber(selectedOpportunity.tradingFees + selectedOpportunity.platformFee + selectedOpportunity.gasFee)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Estimated Profit</p>
                    <p className="font-medium text-green-600">${formatNumber(selectedOpportunity.netProfit)} ({selectedOpportunity.netProfitPercentage.toFixed(2)}%)</p>
                  </div>
                </div>

                {executing && (
                  <div className="space-y-2">
                    <Progress value={executionProgress} className="h-2" />
                    <p className="text-sm text-center text-muted-foreground">
                      {transactionStatus === TransactionStatus.PENDING && "Executing trade..."}
                      {transactionStatus === TransactionStatus.SUCCESS && "Trade executed successfully!"}
                      {transactionStatus === TransactionStatus.ERROR && "Trade failed. Please try again."}
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>* All trades are executed on-chain and may be subject to slippage and changing market conditions.</p>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div className="text-sm">
                {!isConnected ? (
                  <span className="text-red-500">
                    Please connect your wallet first
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setExecuteDialogOpen(false)}
                  disabled={executing}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleExecuteTrade}
                  disabled={executing || !isConnected}
                >
                  {executing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    'Execute Trade'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ArbitrageOpportunities;
