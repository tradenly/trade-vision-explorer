
import { BaseAdapter } from './base-adapter.ts';
import { PriceResult } from '../types.ts';
import { rateLimiter } from '../utils/rate-limiter.ts';

export class OneInchAdapter extends BaseAdapter {
  private apiKey: string | null = null;
  private readonly BASE_URL = 'https://api.1inch.io/v5.0';
  
  constructor() {
    super('1inch');
  }
  
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  async getPrice(baseTokenAddress: string, quoteTokenAddress: string, chainId: number): Promise<PriceResult | null> {
    try {
      // 1inch only works with EVM chains
      if (chainId === 101) { // 101 is Solana
        return null;
      }

      await rateLimiter.waitForSlot();
      
      // Use proper 1inch API endpoint with chain ID
      const url = `${this.BASE_URL}/${chainId}/quote?fromTokenAddress=${baseTokenAddress}&toTokenAddress=${quoteTokenAddress}&amount=1000000000000000000`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      // Add API key if available
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await this.fetchWithRetry(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.toAmount) {
        throw new Error('No price data returned from 1inch');
      }

      // Calculate price from amounts
      const fromAmount = parseInt(data.fromAmount) / Math.pow(10, 18); // Assuming 18 decimals
      const toAmount = parseInt(data.toAmount) / Math.pow(10, 6); // USDC has 6 decimals
      const price = toAmount / fromAmount;
      
      const tokenSymbol = chainId === 56 ? 'BNB' : chainId === 137 ? 'MATIC' : 'ETH';

      return {
        source: this.getName(),
        price: price,
        timestamp: Date.now(),
        liquidity: this.estimateLiquidity(tokenSymbol, this.getName()),
        tradingFee: this.getTradingFee(this.getName())
      };
    } catch (error) {
      console.error(`Error in 1inch adapter:`, error);
      return null;
    }
  }
}
