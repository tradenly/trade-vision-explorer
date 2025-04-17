
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
