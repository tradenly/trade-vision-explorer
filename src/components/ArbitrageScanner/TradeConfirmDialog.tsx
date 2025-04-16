
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2 } from 'lucide-react';

interface TradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: ArbitrageOpportunity | null;
  onConfirm: () => void;
  executing: string | null;
  transactionStatus: 'pending' | 'success' | 'error' | null;
  investmentAmount: number;
}

const TradeConfirmDialog: React.FC<TradeConfirmDialogProps> = ({
  open,
  onOpenChange,
  opportunity,
  onConfirm,
  executing,
  transactionStatus,
  investmentAmount,
}) => {
  if (!opportunity) {
    return null;
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !executing && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Arbitrage Trade</DialogTitle>
          <DialogDescription>
            Review the details of this arbitrage opportunity before executing the trade.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 py-2">
            <span className="font-medium">Token Pair:</span>
            <span>{opportunity.tokenPair}</span>
            
            <span className="font-medium">Buy On:</span>
            <span>{opportunity.buyDex} (${opportunity.buyPrice.toFixed(4)})</span>
            
            <span className="font-medium">Sell On:</span>
            <span>{opportunity.sellDex} (${opportunity.sellPrice.toFixed(4)})</span>
            
            <span className="font-medium">Network:</span>
            <span className="capitalize">{opportunity.network}</span>
            
            <span className="font-medium">Gas Fee:</span>
            <span>${opportunity.gasFee.toFixed(4)}</span>
            
            <span className="font-medium">Trading Fees:</span>
            <span>${opportunity.tradingFees.toFixed(4)}</span>
            
            <span className="font-medium">Platform Fee (0.5%):</span>
            <span>${opportunity.platformFee.toFixed(4)}</span>
            
            <span className="font-medium">Available Liquidity:</span>
            <span>${opportunity.liquidity?.toLocaleString() || 'Unknown'}</span>
            
            <span className="font-medium">Investment Amount:</span>
            <span>${investmentAmount.toLocaleString()}</span>
            
            <span className="font-medium">Expected Profit:</span>
            <span className="text-green-600 font-bold">${opportunity.estimatedProfit.toFixed(4)} ({opportunity.estimatedProfitPercentage.toFixed(2)}%)</span>
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
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!executing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!!executing}>
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
  );
};

export default TradeConfirmDialog;
