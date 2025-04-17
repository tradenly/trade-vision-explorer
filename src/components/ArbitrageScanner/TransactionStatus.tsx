
import React from 'react';
import { type TransactionStatus } from '@/hooks/useExecutionProgress';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface TransactionStatusDisplayProps {
  transactionStatus: TransactionStatus;
  progress: number;
  step: string;
}

const TransactionStatusDisplay: React.FC<TransactionStatusDisplayProps> = ({
  transactionStatus,
  progress,
  step,
}) => {
  if (transactionStatus === 'pending') {
    return (
      <div className="space-y-2">
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <AlertTitle>Processing transaction</AlertTitle>
          <AlertDescription>Please wait while the trade is being executed...</AlertDescription>
        </Alert>
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">{step}</p>
        </div>
      </div>
    );
  }

  if (transactionStatus === 'success') {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4 mr-2" />
        <AlertTitle>Success!</AlertTitle>
        <AlertDescription>The trade has been successfully executed.</AlertDescription>
      </Alert>
    );
  }

  if (transactionStatus === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4 mr-2" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to execute the trade. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default TransactionStatusDisplay;
