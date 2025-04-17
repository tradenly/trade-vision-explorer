
import { ArbitrageOpportunity } from '@/services/dexService';

export interface TradeDetailsProps {
  opportunity: ArbitrageOpportunity;
  tradeAmount: number;
  buyPriceImpact: number;
  estimatedTokenAmount: number;
}

export interface TradeSettingsProps {
  customAmount: number;
  slippageTolerance: number;
  advancedMode: boolean;
  buyPriceImpact: number;
  executing: string | null;
  onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlippageChange: (value: number[]) => void;
  onAdvancedModeChange: (value: boolean) => void;
}

export interface TransactionStatusProps {
  transactionStatus: string;
  progress: number;
  step: string;
}
