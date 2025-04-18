
/**
 * Service to calculate transaction fees for trades
 */
export class FeeService {
  private static instance: FeeService;
  
  // Platform fee percentage (0.5%)
  private readonly PLATFORM_FEE_PERCENTAGE = 0.5;
  
  // DEX trading fee percentages
  private readonly tradingFees: Record<string, number> = {
    'uniswap': 0.3,
    'sushiswap': 0.3,
    'pancakeswap': 0.25,
    'curve': 0.04,
    'balancer': 0.3,
    'orca': 0.3,
    'jupiter': 0.35,
    'raydium': 0.3,
    'quickswap': 0.3
  };
  
  // Base gas fees by network in USD
  private readonly baseGasFees: Record<string, number> = {
    'ethereum': 5.0,
    'bnb': 0.1,
    'polygon': 0.05,
    'arbitrum': 0.1,
    'optimism': 0.1,
    'base': 0.05,
    'solana': 0.00025
  };

  private constructor() {}

  public static getInstance(): FeeService {
    if (!FeeService.instance) {
      FeeService.instance = new FeeService();
    }
    return FeeService.instance;
  }

  /**
   * Calculate all fees for a trade
   * @param tradeAmount Trade amount in USD
   * @param buyDex Buy DEX name
   * @param sellDex Sell DEX name
   * @param network Blockchain network
   * @returns Object containing all fee components
   */
  public async calculateAllFees(
    tradeAmount: number,
    buyDex: string,
    sellDex: string,
    network: string
  ): Promise<{
    tradingFee: number;
    platformFee: number;
    gasFee: number;
    totalFees: number;
  }> {
    const tradingFee = this.calculateTradingFees(tradeAmount, buyDex, sellDex);
    const platformFee = this.calculatePlatformFee(tradeAmount);
    const gasFee = await this.estimateGasFee(network, buyDex, sellDex);
    
    const totalFees = tradingFee + platformFee + gasFee;
    
    return {
      tradingFee,
      platformFee,
      gasFee,
      totalFees
    };
  }

  /**
   * Calculate trading fees for a trade
   * @param tradeAmount Trade amount in USD
   * @param buyDex Buy DEX name
   * @param sellDex Sell DEX name
   * @returns Combined trading fees in USD
   */
  public calculateTradingFees(
    tradeAmount: number,
    buyDex: string,
    sellDex: string
  ): number {
    const buyDexFeePercentage = this.getDexFeePercentage(buyDex);
    const sellDexFeePercentage = this.getDexFeePercentage(sellDex);
    
    // Calculate fees (buy fee is on input amount, sell fee is on output amount)
    const buyFee = (buyDexFeePercentage / 100) * tradeAmount;
    
    // Approximate sell amount (after buying)
    const approxSellAmount = tradeAmount - buyFee;
    const sellFee = (sellDexFeePercentage / 100) * approxSellAmount;
    
    return buyFee + sellFee;
  }

  /**
   * Calculate platform fee
   * @param tradeAmount Trade amount in USD
   * @returns Platform fee in USD
   */
  public calculatePlatformFee(tradeAmount: number): number {
    return (this.PLATFORM_FEE_PERCENTAGE / 100) * tradeAmount;
  }

  /**
   * Estimate gas fees for a trade
   * @param network Blockchain network
   * @param buyDex Buy DEX name
   * @param sellDex Sell DEX name
   * @returns Estimated gas fee in USD
   */
  public async estimateGasFee(
    network: string,
    buyDex: string,
    sellDex: string
  ): Promise<number> {
    try {
      // Try to get latest gas prices from database
      const { data: gasPriceData } = await supabase
        .from('gas_fees')
        .select('*')
        .eq('network', network)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (gasPriceData && gasPriceData.length > 0) {
        const gasData = gasPriceData[0];
        
        if (network === 'solana') {
          // Solana uses a different fee structure
          return (gasData.base_fee + gasData.priority_fee) / 1000000000 * this.getSolanaPrice();
        } else {
          // EVM chains
          const baseGas = gasData.base_fee;
          const priorityFee = gasData.priority_fee || 0;
          const gasPrice = baseGas + priorityFee;
          
          // Standard gas units for swap operations
          const gasUnits = this.getSwapGasUnits(buyDex, sellDex);
          
          // Get native token price and calculate fee
          const tokenPrice = await this.getNativeTokenPrice(network);
          return (gasPrice * gasUnits) / 1e9 * tokenPrice;
        }
      }
      
      // Fallback to base estimates
      return this.getBaseGasFee(network);
    } catch (error) {
      console.error('Error estimating gas fee:', error);
      return this.getBaseGasFee(network);
    }
  }

  /**
   * Get the trading fee percentage for a DEX
   * @param dexName Name of the DEX
   * @returns Fee percentage (0.3 = 0.3%)
   */
  public getDexFeePercentage(dexName: string): number {
    const dexLower = dexName.toLowerCase();
    return this.tradingFees[dexLower] || 0.3; // Default to 0.3% if unknown
  }
  
  /**
   * Get base gas fee estimate for a network
   * @param network Blockchain network
   * @returns Base gas fee in USD
   */
  private getBaseGasFee(network: string): number {
    const networkLower = network.toLowerCase();
    return this.baseGasFees[networkLower] || 0.1; // Default to $0.1 if unknown
  }
  
  /**
   * Get estimated gas units for swap operations
   * @param buyDex Buy DEX name
   * @param sellDex Sell DEX name
   * @returns Estimated gas units
   */
  private getSwapGasUnits(buyDex: string, sellDex: string): number {
    // Base gas units for different DEXes (approximate)
    const gasUnitsMap: Record<string, number> = {
      'uniswap': 180000,
      'sushiswap': 190000,
      'pancakeswap': 160000,
      'curve': 350000,
      'balancer': 250000,
      'quickswap': 160000
    };
    
    const buyGas = gasUnitsMap[buyDex.toLowerCase()] || 200000;
    const sellGas = gasUnitsMap[sellDex.toLowerCase()] || 200000;
    
    return buyGas + sellGas;
  }
  
  /**
   * Get current price of SOL token
   * @returns SOL price in USD
   */
  private getSolanaPrice(): number {
    // In a real-world scenario, we would fetch this from an API
    // Hard-coding to $150 for now
    return 150;
  }
  
  /**
   * Get native token price for a network
   * @param network Blockchain network
   * @returns Native token price in USD
   */
  private async getNativeTokenPrice(network: string): Promise<number> {
    try {
      const tokenSymbol = this.getNetworkNativeToken(network);
      
      // Try to get the price from our database
      const { data } = await supabase
        .from('token_prices')
        .select('price_usd')
        .eq('source', 'coingecko')
        .eq('token_id', tokenSymbol)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0 && data[0].price_usd) {
        return data[0].price_usd;
      }
      
      // Fallback prices if database query fails
      const fallbackPrices: Record<string, number> = {
        'ETH': 3000,
        'BNB': 500,
        'MATIC': 1.5,
        'ARB': 1,
        'OP': 2,
        'SOL': 150
      };
      
      return fallbackPrices[tokenSymbol] || 1;
    } catch (error) {
      console.error('Error getting native token price:', error);
      return 1; // Default to $1 as a fallback
    }
  }
  
  /**
   * Get native token symbol for a network
   * @param network Blockchain network
   * @returns Native token symbol
   */
  private getNetworkNativeToken(network: string): string {
    const networkTokens: Record<string, string> = {
      'ethereum': 'ETH',
      'bnb': 'BNB',
      'polygon': 'MATIC',
      'arbitrum': 'ETH',
      'optimism': 'ETH',
      'base': 'ETH',
      'solana': 'SOL'
    };
    
    return networkTokens[network.toLowerCase()] || 'ETH';
  }
}
