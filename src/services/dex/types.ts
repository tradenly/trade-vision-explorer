
export interface PriceQuote {
  price: number;
  timestamp: number;
  fees: number;
  liquidityUSD?: number;
  isMock?: boolean;
  isFallback?: boolean;
  dexName?: string;    
  source?: string;     
  gasEstimate?: number;
  liquidityInfo?: any;  // Add this to fix the errors
  isBuy?: boolean;     // Add this to fix the errors
}

export enum TransactionStatus {
    IDLE = "IDLE",
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    ERROR = "ERROR",
    NEEDS_APPROVAL = "NEEDS_APPROVAL"
}

// Add DexAdapter and DexConfig interfaces
export interface DexConfig {
  name: string;
  slug: string;
  chainIds: number[];
  tradingFeePercentage: number;
  enabled: boolean;
}

export interface DexAdapter {
  getName(): string;
  getSlug(): string;
  getSupportedChains(): number[];
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  getTradingFeePercentage(): number;
  fetchQuote(baseToken: any, quoteToken: any, amount?: number): Promise<PriceQuote>;
}
