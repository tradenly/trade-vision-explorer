
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TransactionStatus, useExecutionProgress } from '@/hooks/useExecutionProgress';
import TradeDetails from './TradeDetails';
import TradeSettings from './TradeSettings';
import TransactionStatus from './TransactionStatus';

interface TradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: ArbitrageOpportunity | null;
  onConfirm: () => void;
  executing: string | null;
  transactionStatus: TransactionStatus;
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
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<number>(investmentAmount);
  const { toast } = useToast();
  
  // Use our custom hook to manage execution progress
  const { progress, step } = useExecutionProgress(
    executing !== null,
    transactionStatus,
    opportunity
  );
  
  if (!opportunity) {
    return null;
  }
  
  const tradeAmount = customAmount || investmentAmount;
  const tradingFee = opportunity.tradingFees / 100 * tradeAmount;
  const estimatedTokenAmount = (tradeAmount - tradingFee) / opportunity.buyPrice;
  
  const buyPriceImpact = opportunity.liquidity 
    ? Math.min((tradeAmount / opportunity.liquidity) * 100, 5) 
    : 0.1;
  
  const handleSlippageChange = (value: number[]) => {
    setSlippageTolerance(value[0]);
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCustomAmount(value);
    } else {
      setCustomAmount(0);
    }
  };
  
  const isPriceImpactHigh = buyPriceImpact > 2;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !executing && onOpenChange(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">Confirm Arbitrage Trade</h2>
          <p className="text-sm text-muted-foreground">
            Review the details of this arbitrage opportunity before executing the trade.
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <TradeDetails 
            opportunity={opportunity}
            tradeAmount={tradeAmount}
            buyPriceImpact={buyPriceImpact}
            estimatedTokenAmount={estimatedTokenAmount}
          />

          <TradeSettings
            customAmount={customAmount}
            slippageTolerance={slippageTolerance}
            advancedMode={advancedMode}
            buyPriceImpact={buyPriceImpact}
            executing={executing}
            onCustomAmountChange={handleCustomAmountChange}
            onSlippageChange={handleSlippageChange}
            onAdvancedModeChange={setAdvancedMode}
          />

          <TransactionStatus
            transactionStatus={transactionStatus}
            progress={progress}
            step={step}
          />
          
          <Alert>
            <Info className="h-4 w-4 mr-2" />
            <AlertDescription className="text-xs">
              By executing this trade, you authorize Tradenly to initiate transactions on your behalf using your connected wallet.
              A platform fee of 0.5% will be collected from successful arbitrage trades.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!executing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!!executing || (isPriceImpactHigh && advancedMode)}>
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
