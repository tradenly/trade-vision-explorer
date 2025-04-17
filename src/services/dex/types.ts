
/**
 * Represents a price quote from a DEX
 */
export interface PriceQuote {
  dexName: string;        // Name of the DEX providing the quote
  price: number;          // The quoted price
  fees?: number;          // Trading fees as a percentage
  gasEstimate?: number;   // Estimated gas cost in USD
  liquidityInfo?: any;    // Optional liquidity information
  liquidityUSD?: number;  // Estimated liquidity in USD
  error?: string;         // Error message if quote failed but fallback was used
  isFallback?: boolean;   // Flag indicating if this is a fallback price
}

/**
 * Configuration for a DEX
 */
export interface DexConfig {
  name: string;               // Display name of DEX
  slug: string;               // Unique identifier for the DEX
  chainIds: number[];         // Chain IDs supported by this DEX
  tradingFeePercentage: number; // Trading fee as a percentage
  enabled: boolean;           // Whether this DEX is enabled for scanning
}

/**
 * Interface for DEX adapters
 */
export interface DexAdapter {
  getName(): string;
  getSupportedChains(): number[];
  getTradingFeePercentage(): number;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  fetchQuote(baseToken: any, quoteToken: any, amount?: number): Promise<PriceQuote>;
}

/**
 * Status of a transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
  NEEDS_APPROVAL = 'needs_approval'
}

/**
 * Network information
 */
export interface NetworkInfo {
  name: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

/**
 * Trade execution options
 */
export interface TradeExecutionOptions {
  slippageTolerance?: number;  // Slippage tolerance in percentage (e.g., 0.5 for 0.5%)
  deadline?: number;          // Transaction deadline in minutes
  gasPrice?: string;          // Custom gas price in wei
  maxFeePerGas?: string;      // Maximum fee per gas for EIP-1559
  maxPriorityFeePerGas?: string; // Maximum priority fee per gas for EIP-1559
  useHardwareWallet?: boolean; // Whether to use hardware wallet
  advancedOptions?: Record<string, any>; // Additional advanced options
}
