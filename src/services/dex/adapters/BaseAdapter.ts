
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

/**
 * Base adapter class for DEX integrations.
 * All specific DEX adapters should extend this class.
 */
export abstract class BaseAdapter {
  private name: string;
  private supportedChains: number[];
  private tradingFeePercentage: number;
  private enabled: boolean;

  constructor(config: {
    name: string;
    slug: string;
    chainIds: number[];
    tradingFeePercentage: number;
    enabled: boolean;
  }) {
    this.name = config.name;
    this.supportedChains = config.chainIds;
    this.tradingFeePercentage = config.tradingFeePercentage;
    this.enabled = config.enabled;
  }

  /**
   * Get the name of the DEX.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the chains supported by this DEX.
   */
  public getSupportedChains(): number[] {
    return this.supportedChains;
  }

  /**
   * Get the trading fee percentage for this DEX.
   */
  public getTradingFeePercentage(): number {
    return this.tradingFeePercentage;
  }

  /**
   * Check if this DEX is enabled for scanning.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable this DEX.
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Fetch price quote for a pair of tokens.
   * This method must be implemented by specific DEX adapters.
   * @param baseToken The token to sell
   * @param quoteToken The token to buy
   * @param amount Amount of baseToken to sell
   */
  public abstract fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount?: number): Promise<PriceQuote>;

  /**
   * Fallback method for when API calls fail - provides estimated price
   * @param baseToken The token to sell
   * @param quoteToken The token to buy
   */
  protected getEstimatedPrice(baseToken: TokenInfo, quoteToken: TokenInfo): number {
    // Base price estimates (for fallback when API calls fail)
    const basePrices: Record<string, number> = {
      'ETH': 3500,
      'WETH': 3500,
      'BNB': 600,
      'WBNB': 600,
      'SOL': 150,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'BUSD': 1,
    };
    
    // Get base prices or default values
    const basePrice = basePrices[baseToken.symbol || ''] || 10;
    const quotePrice = basePrices[quoteToken.symbol || ''] || 0.1;
    
    // Add a slight random variation (±1%) to simulate different DEX prices
    const variation = 0.99 + Math.random() * 0.02;
    
    return (basePrice / quotePrice) * variation;
  }
}
