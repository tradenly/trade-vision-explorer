
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export class JupiterAdapter extends BaseAdapter {
  private readonly PRICE_API_URL = 'https://price.jup.ag/v4/price';
  
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<PriceQuote> {
    try {
      // Only works with Solana
      if (baseToken.chainId !== 101) {
        throw new Error('Jupiter adapter only supports Solana');
      }

      const url = `${this.PRICE_API_URL}?ids=${baseToken.address}&vsToken=${quoteToken.address}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.data?.[baseToken.address]?.price) {
        throw new Error('No price data available');
      }

      return {
        dexName: this.getName(),
        price: data.data[baseToken.address].price,
        fees: 0.0035, // Jupiter typical fee
        gasEstimate: 0.000001, // Solana gas is very cheap
        liquidityUSD: data.data[baseToken.address].marketCap || 1000000,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error in ${this.getName()} quote:`, error);
      throw error;
    }
  }
}
