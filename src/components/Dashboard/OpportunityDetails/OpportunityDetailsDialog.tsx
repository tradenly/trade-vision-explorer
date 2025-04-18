
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { TransactionStatus } from '@/services/dex/types';
import TradeSummary from './TradeSummary';
import TradeExecutionProgress from './TradeExecutionProgress';
import DialogFooter from './DialogFooter';
import OpportunitySkeleton from './OpportunitySkeleton';

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
  loading?: boolean;
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
  investmentAmount,
  loading = false
}) => {
  if (!opportunity && !loading) return null;

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
          {loading ? (
            <OpportunitySkeleton />
          ) : (
            opportunity && (
              <TradeSummary 
                opportunity={opportunity} 
                investmentAmount={investmentAmount} 
              />
            )
          )}

          <TradeExecutionProgress
            executing={executing}
            transactionStatus={transactionStatus}
            executionProgress={executionProgress}
          />

          <div className="text-xs text-muted-foreground">
            <p>* All trades are executed on-chain and may be subject to slippage and changing market conditions.</p>
          </div>
        </div>

        <DialogFooter
          isConnected={isConnected}
          walletAddress={walletAddress}
          executing={executing}
          onExecute={onExecute}
          onClose={() => onOpenChange(false)}
          disabled={loading}
        />
      </DialogContent>
    </Dialog>
  );
};

export default OpportunityDetailsDialog;
