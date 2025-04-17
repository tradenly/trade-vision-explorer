
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
  ERROR = 'error'
}

export interface PriceQuote {
  price: number;
  timestamp: number;
  liquidity?: number;
  source?: string;
}

export interface DexAdapter {
  getName(): string;
  getSlug(): string;
  getSupportedChains(): number[];
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote | null>;
}
