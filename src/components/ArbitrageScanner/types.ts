
import { ArbitrageOpportunity } from '@/services/dexService';
import { TransactionStatus } from '@/services/dex/types';

export interface TradeDetailsProps {
  opportunity: ArbitrageOpportunity;
  tradeAmount: number;
  buyPriceImpact: number;
  sellPriceImpact: number;
  estimatedTokenAmount: number;
  tradingFees: number;
  gasFees: number;
  platformFee: number;
  maxTradeSize: number;
}

export interface TradeSettingsProps {
  customAmount: number;
  slippageTolerance: number;
  advancedMode: boolean;
  buyPriceImpact: number;
  executing: string | null;
  maxTradeSize: number;
  onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlippageChange: (value: number[]) => void;
  onAdvancedModeChange: (value: boolean) => void;
}

export interface TransactionStatusProps {
  transactionStatus: string;
  progress: number;
  step: string;
  details?: {
    txHash?: string;
    explorerUrl?: string;
    gasFee?: number;
    tradingFees?: number;
    priceImpact?: number;
    slippage?: number;
  };
}
