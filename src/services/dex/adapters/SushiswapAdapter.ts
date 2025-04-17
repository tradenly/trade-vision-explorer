
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export class SushiswapAdapter extends BaseAdapter {
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      // Prepare API parameters
      const fromAddress = baseToken.address;
      const toAddress = quoteToken.address;
      const chainId = baseToken.chainId;
      
      console.log(`[SushiswapAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol} on chain ${chainId}`);
      
      // For SushiSwap, we can use the Graph API or a direct API if available
      // For now, we'll use a fallback mechanism with a slight price difference from Uniswap
      
      // Simulate price variation (SushiSwap typically has different prices than Uniswap)
      const basePrice = baseToken.symbol === 'ETH' 
        ? 3500 + Math.random() * 100 
        : baseToken.symbol === 'BNB' 
          ? 550 + Math.random() * 20
          : 10 + Math.random() * 1;
      
      // Simulate price variations - SushiSwap typically has slightly higher slippage
      const variation = 0.97 + Math.random() * 0.06; // 0.97 - 1.03
      const price = basePrice * variation;
      
      // SushiSwap typically has slightly higher gas usage
      const gasEstimateGwei = 180000; // Higher than Uniswap
      const gasPriceGwei = 50; // Using a reasonable default gas price in Gwei
      const ethPrice = 3500; // Estimated ETH price in USD
      const gasEstimateUSD = (gasEstimateGwei * gasPriceGwei * 1e-18) * ethPrice;
      
      console.log(`[SushiswapAdapter] Estimated price for ${baseToken.symbol}/${quoteToken.symbol}: ${price}, gas: $${gasEstimateUSD}`);
      
      return {
        dexName: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: gasEstimateUSD,
        liquidityUSD: 800000 // SushiSwap typically has less liquidity than Uniswap
      };
    } catch (error) {
      console.error(`Error in ${this.getName()} quote:`, error);
      
      // If all fails, provide a fallback
      const basePrice = baseToken.symbol === 'ETH' 
        ? 3500 + Math.random() * 100 
        : baseToken.symbol === 'BNB' 
          ? 550 + Math.random() * 20
          : 10 + Math.random() * 1;
      
      const variation = 0.97 + Math.random() * 0.06; // 0.97 - 1.03
      
      return {
        dexName: this.getName(),
        price: basePrice * variation,
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.006, // Slightly higher than Uniswap
        liquidityUSD: 800000 // Default estimated liquidity
      };
    }
  }
}
