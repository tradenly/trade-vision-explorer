
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { formatNumber, formatTokenPrice } from '@/lib/utils';
import { ArbitrageOpportunity } from '@/services/dexService';
import { TransactionStatus } from '@/services/dex/types';

interface OpportunityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: ArbitrageOpportunity | null;
  executing: boolean;
  transactionStatus: TransactionStatus;
  executionProgress: number;
  onExecute: () => void;
  walletAddress: string | null;
  isConnected: boolean;
  investmentAmount: number;
}

const OpportunityDetailsDialog: React.FC<OpportunityDetailsDialogProps> = ({
  open,
  onOpenChange,
  opportunity,
  executing,
  transactionStatus,
  executionProgress,
  onExecute,
  walletAddress,
  isConnected,
  investmentAmount
}) => {
  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Execute Arbitrage Trade</DialogTitle>
          <DialogDescription>
            Review and confirm this arbitrage opportunity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Token Pair</p>
              <p className="font-medium">{opportunity.tokenPair}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Network</p>
              <p className="font-medium">{opportunity.network}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Buy on</p>
              <p className="font-medium">{opportunity.buyDex} @ ${formatTokenPrice(opportunity.buyPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Sell on</p>
              <p className="font-medium">{opportunity.sellDex} @ ${formatTokenPrice(opportunity.sellPrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Investment</p>
              <p className="font-medium">${formatNumber(investmentAmount)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Price Difference</p>
              <p className="font-medium text-green-600">+{opportunity.priceDifferencePercentage.toFixed(2)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
              <p className="font-medium text-amber-600">
                ${formatNumber(opportunity.tradingFees + opportunity.platformFee + opportunity.gasFee)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Estimated Profit</p>
              <p className="font-medium text-green-600">
                ${formatNumber(opportunity.netProfit)} ({opportunity.netProfitPercentage.toFixed(2)}%)
              </p>
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

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div className="text-sm">
            {!isConnected ? (
              <span className="text-red-500">Please connect your wallet first</span>
            ) : (
              <span className="text-muted-foreground">
                Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
              </span>
            )}
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={executing}
            >
              Cancel
            </Button>
            <Button 
              onClick={onExecute}
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
  );
};

export default OpportunityDetailsDialog;
