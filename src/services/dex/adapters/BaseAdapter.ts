
import { DexAdapter, DexConfig, PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export abstract class BaseAdapter implements DexAdapter {
  protected config: DexConfig;

  constructor(config: DexConfig) {
    this.config = config;
  }

  public getName(): string {
    return this.config.name;
  }

  public getSupportedChains(): number[] {
    return this.config.chainIds;
  }

  public getTradingFeePercentage(): number {
    return this.config.tradingFeePercentage;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  // This method must be implemented by concrete adapters
  public abstract fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount?: number): Promise<PriceQuote>;
}
