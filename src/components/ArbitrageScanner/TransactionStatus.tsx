
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { TransactionStatus as TxStatus } from '@/services/dex/types';
import { TransactionStatusProps } from './types';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TransactionStatusIndicator: React.FC<TransactionStatusProps> = ({
  transactionStatus,
  progress,
  step,
  details
}) => {
  if (transactionStatus === TxStatus.IDLE) return null;

  const getStatusIcon = () => {
    if (transactionStatus === TxStatus.SUCCESS) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (transactionStatus === TxStatus.ERROR) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (transactionStatus === TxStatus.NEEDS_APPROVAL) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{step}</span>
        {getStatusIcon()}
      </div>
      
      <Progress value={progress} className={transactionStatus === TxStatus.ERROR ? "bg-red-100" : ""} />
      
      {details && (transactionStatus === TxStatus.SUCCESS || transactionStatus === TxStatus.ERROR) && (
        <div className="mt-3 text-xs space-y-2 bg-muted p-3 rounded-md">
          {details.txHash && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transaction:</span>
              <span className="font-mono">{details.txHash.substring(0, 8)}...{details.txHash.substring(details.txHash.length - 6)}</span>
            </div>
          )}
          
          {details.explorerUrl && (
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => window.open(details.explorerUrl, '_blank')}
              >
                View on Explorer <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
          
          {details.priceImpact !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Impact:</span>
              <span className={details.priceImpact > 3 ? "text-red-500" : ""}>{details.priceImpact.toFixed(2)}%</span>
            </div>
          )}
          
          {details.slippage !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slippage:</span>
              <span className={details.slippage > 1 ? "text-yellow-500" : ""}>{details.slippage.toFixed(2)}%</span>
            </div>
          )}
          
          {details.gasFee !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gas Fee:</span>
              <span>${details.gasFee.toFixed(2)}</span>
            </div>
          )}
          
          {details.tradingFees !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trading Fees:</span>
              <span>${details.tradingFees.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionStatusIndicator;
