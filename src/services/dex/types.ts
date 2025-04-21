export interface PriceQuote {
  price: number;
  timestamp: number;
  fees: number;
  liquidityUSD?: number;
  isMock?: boolean;
  isFallback?: boolean;
}

export enum TransactionStatus {
    IDLE = "IDLE",
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    ERROR = "ERROR",
		NEEDS_APPROVAL = "NEEDS_APPROVAL"
}
