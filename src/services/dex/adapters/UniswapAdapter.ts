
import { BaseAdapter } from './BaseAdapter';
import { PriceQuote } from '../types';
import { TokenInfo } from '../../tokenListService';

export class UniswapAdapter extends BaseAdapter {
  public async fetchQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number = 1): Promise<PriceQuote> {
    try {
      // Prepare API parameters
      const fromAddress = baseToken.address;
      const toAddress = quoteToken.address;
      const chainId = baseToken.chainId;
      
      // Convert amount to wei (smallest unit)
      const amountInWei = (amount * Math.pow(10, baseToken.decimals || 18)).toString();
      
      console.log(`[UniswapAdapter] Fetching quote for ${baseToken.symbol}/${quoteToken.symbol} on chain ${chainId}`);
      console.log(`[UniswapAdapter] Token addresses: ${fromAddress} -> ${toAddress}, amount: ${amount}`);
      
      // Use 1inch API for getting quotes
      // This is a free API that provides price data across multiple DEXs
      const apiUrl = `https://api.1inch.io/v5.0/${chainId}/quote?` +
                     `fromTokenAddress=${fromAddress}&toTokenAddress=${toAddress}&amount=${amountInWei}`;
      
      console.log(`[UniswapAdapter] Calling API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
        // Add cache control to prevent excessive API calls
        cache: 'no-cache'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[UniswapAdapter] 1inch API error: ${response.status} - ${errorText}`);
        throw new Error(`1inch API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`[UniswapAdapter] 1inch API response:`, data);
      
      // Calculate price from the response
      const fromAmount = Number(data.fromTokenAmount) / Math.pow(10, baseToken.decimals || 18);
      const toAmount = Number(data.toTokenAmount) / Math.pow(10, quoteToken.decimals || 18);
      const price = toAmount / fromAmount;
      
      // Extract liquidity information from protocols data if available
      let liquidityUSD = 0;
      
      if (data.protocols && data.protocols.length > 0) {
        // Sum up liquidity from all protocol routes when available
        // This is an estimation based on the protocols data
        try {
          data.protocols.forEach((route: any) => {
            route.forEach((protocol: any) => {
              // Some protocols include liquidity information
              if (protocol.liquidity) {
                liquidityUSD += Number(protocol.liquidity) || 0;
              }
            });
          });
        } catch (liquidityErr) {
          console.warn('[UniswapAdapter] Error extracting liquidity data', liquidityErr);
        }
      }
      
      // If no liquidity was found in the response, use a default value
      if (liquidityUSD <= 0) {
        liquidityUSD = 1000000; // Default fallback liquidity estimate
      }
      
      // Extract gas fees from 1inch response if available
      const gasEstimateGwei = Number(data.estimatedGas) || 150000;
      const gasPriceGwei = 50; // Using a reasonable default gas price in Gwei
      const ethPrice = 3500; // Estimated ETH price in USD
      const gasEstimateUSD = (gasEstimateGwei * gasPriceGwei * 1e-18) * ethPrice;
      
      console.log(`[UniswapAdapter] Fetched price for ${baseToken.symbol}/${quoteToken.symbol}: ${price}, gas: $${gasEstimateUSD}`);
      
      return {
        source: this.getName(),
        price: price,
        fees: this.getTradingFeePercentage(),
        gasEstimate: gasEstimateUSD,
        liquidityUSD: liquidityUSD,
        liquidityInfo: {
          protocols: data.protocols || [],
          estimatedGas: data.estimatedGas,
          route: data.protocols || [],
          toTokenAmount: data.toTokenAmount,
          fromTokenAmount: data.fromTokenAmount
        }
      };
    } catch (error) {
      console.error(`[UniswapAdapter] Error fetching ${this.getName()} quote:`, error);
      
      // Implement a more robust fallback strategy with informative logging
      // This helps maintain app functionality even when API calls fail
      return this.getFallbackQuote(baseToken, quoteToken, amount, error);
    }
  }
  
  /**
   * Provides a fallback price quote when the API call fails
   * This helps maintain app functionality during API outages or rate limiting
   */
  private getFallbackQuote(baseToken: TokenInfo, quoteToken: TokenInfo, amount: number, error: any): PriceQuote {
    console.log(`[UniswapAdapter] Using fallback price quote mechanism for ${baseToken.symbol}/${quoteToken.symbol}`);
    
    try {
      // First try to use a simulated price based on well-known token values
      const basePrice = this.getTokenBasePrice(baseToken.symbol);
      const quotePrice = this.getTokenBasePrice(quoteToken.symbol);
      
      if (basePrice && quotePrice) {
        // Calculate a realistic price with a small random variation to simulate market conditions
        const variation = 0.995 + Math.random() * 0.01; // 0.995 - 1.005
        const simulatedPrice = (basePrice / quotePrice) * variation;
        
        console.log(`[UniswapAdapter] Generated fallback price: ${simulatedPrice} using base prices ${basePrice}/${quotePrice}`);
        
        return {
          source: this.getName(),
          price: simulatedPrice,
          fees: this.getTradingFeePercentage(),
          gasEstimate: 0.005, // Default estimated gas in USD for EVM chains
          liquidityUSD: 1000000, // Default liquidity estimate
          error: error instanceof Error ? error.message : 'Unknown API error',
          isFallback: true
        };
      }
      
      // If we don't have base prices, use the generic estimate from BaseAdapter
      return {
        source: this.getName(),
        price: this.getEstimatedPrice(baseToken, quoteToken),
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.005,
        liquidityUSD: 1000000,
        error: error instanceof Error ? error.message : 'Unknown API error',
        isFallback: true
      };
    } catch (fallbackError) {
      console.error('[UniswapAdapter] Critical error in fallback mechanism:', fallbackError);
      
      // Last resort fallback - return a basic estimate
      return {
        source: this.getName(),
        price: 1.0, // Neutral price as ultimate fallback
        fees: this.getTradingFeePercentage(),
        gasEstimate: 0.005,
        liquidityUSD: 1000000,
        error: 'Multiple failures in price fetching',
        isFallback: true
      };
    }
  }
  
  /**
   * Get estimated base price for common tokens
   * This helps provide realistic fallbacks when API calls fail
   */
  private getTokenBasePrice(symbol: string): number | null {
    const normalizedSymbol = symbol?.toUpperCase();
    
    const prices: Record<string, number> = {
      'ETH': 3500,
      'WETH': 3500,
      'BTC': 65000,
      'WBTC': 65000,
      'BNB': 550,
      'WBNB': 550,
      'SOL': 150,
      'USDC': 1,
      'USDT': 1,
      'DAI': 1,
      'BUSD': 1,
      'MATIC': 1.2,
      'AVAX': 35,
      'LINK': 15,
      'UNI': 10,
      'AAVE': 95,
    };
    
    return prices[normalizedSymbol] || null;
  }
}
