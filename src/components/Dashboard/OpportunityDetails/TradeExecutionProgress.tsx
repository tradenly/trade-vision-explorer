
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { TransactionStatus } from '@/services/dex/types';

interface TradeExecutionProgressProps {
  executing: boolean;
  transactionStatus: TransactionStatus;
  executionProgress: number;
}

const TradeExecutionProgress: React.FC<TradeExecutionProgressProps> = ({
  executing,
  transactionStatus,
  executionProgress
}) => {
  if (!executing) return null;

  return (
    <div className="space-y-2">
      <Progress value={executionProgress} />
      <p className="text-sm text-center text-muted-foreground">
        {transactionStatus === TransactionStatus.PENDING && "Executing trade..."}
        {transactionStatus === TransactionStatus.SUCCESS && "Trade executed successfully!"}
        {transactionStatus === TransactionStatus.ERROR && "Trade failed. Please try again."}
      </p>
    </div>
  );
};

export default TradeExecutionProgress;
