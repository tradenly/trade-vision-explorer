
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { TransactionStatus as TxStatus } from '@/services/dex/types';
import { TransactionStatusProps } from './types';

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  transactionStatus,
  progress,
  step
}) => {
  if (transactionStatus === TxStatus.NONE) return null;

  return (
    <div className="space-y-2">
      <Progress value={progress} />
      <p className="text-sm text-muted-foreground">{step}</p>
    </div>
  );
};

export default TransactionStatus;
