
import { TokenInfo } from '@/services/tokenListService';

export interface DexConfig {
  name: string;
  slug: string;
  chainIds: number[];
  tradingFeePercentage: number;
  enabled: boolean;
}

export enum TransactionStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
  NEEDS_APPROVAL = 'needs_approval'
}

export interface PriceQuote {
  price: number;
  timestamp?: number;
  liquidity?: number;
  source?: string;
  dexName?: string; // Added this property
  fees?: number;
  gasEstimate?: number;
  liquidityUSD?: number;
  liquidityInfo?: any;
  isFallback?: boolean;
  error?: string;
}

export interface DexAdapter {
  getName(): string;
  getSlug(): string;
  getSupportedChains(): number[];
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount?: number): Promise<PriceQuote | null>;
}
