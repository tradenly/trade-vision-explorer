
import { TransactionStatus } from '@/services/dex/types';

export interface TransactionStatusProps {
  transactionStatus: TransactionStatus;
  progress: number;
  step: string;
  details?: {
    txHash?: string;
    explorerUrl?: string;
    priceImpact?: number;
    slippage?: number;
    gasFee?: number;
    tradingFees?: number;
  };
}
