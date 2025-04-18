
import { supabase } from '@/lib/supabaseClient';

export interface FeeEstimate {
  tradingFee: number;
  platformFee: number;
  gasFee: number;
  totalFee: number;
}

export class FeeService {
  private static instance: FeeService;
  private dexFeeCache: Map<string, number>;
  private gasFeeCache: Map<string, number>;
  private readonly PLATFORM_FEE_PERCENTAGE = 0.5; // 0.5%
  private cacheExpiry: number = Date.now();
  
  private constructor() {
    this.dexFeeCache = new Map();
    this.gasFeeCache = new Map();
    this.refreshCache();
  }

  public static getInstance(): FeeService {
    if (!FeeService.instance) {
      FeeService.instance = new FeeService();
    }
    return FeeService.instance;
  }
  
  /**
   * Refresh fee cache from database
   */
  private async refreshCache(): Promise<void> {
    try {
      // Cache expiry set to 5 minutes
      if (Date.now() - this.cacheExpiry < 300000) return;
      
      // Get DEX fees from database
      const { data: dexSettings } = await supabase
        .from('dex_settings')
        .select('slug, trading_fee_percentage');
      
      if (dexSettings) {
        dexSettings.forEach(dex => {
          this.dexFeeCache.set(dex.slug.toLowerCase(), dex.trading_fee_percentage / 100);
        });
      }
      
      // Get gas fees from database
      const { data: gasFees } = await supabase
        .from('gas_fees')
        .select('network, base_fee, priority_fee');
        
      if (gasFees) {
        gasFees.forEach(gas => {
          this.gasFeeCache.set(gas.network.toLowerCase(), gas.base_fee + (gas.priority_fee || 0));
        });
      }
      
      this.cacheExpiry = Date.now();
    } catch (error) {
      console.error('Error refreshing fee cache:', error);
    }
  }
  
  /**
   * Get trading fee percentage for a specific DEX
   * @param dexName Name of the DEX
   * @returns Trading fee as a decimal (e.g., 0.003 for 0.3%)
   */
  public async getTradingFee(dexName: string): Promise<number> {
    await this.refreshCache();
    
    const normalizedDexName = dexName.toLowerCase();
    
    // Return from cache if available
    if (this.dexFeeCache.has(normalizedDexName)) {
      return this.dexFeeCache.get(normalizedDexName) || 0.003;
    }
    
    // Default fees for common DEXes if not in database
    const defaultFees: Record<string, number> = {
      'uniswap': 0.003,
      'sushiswap': 0.003,
      'pancakeswap': 0.0025,
      'curve': 0.0004,
      'balancer': 0.002,
      'jupiter': 0.0035,
      'orca': 0.003,
      'raydium': 0.003
    };
    
    return defaultFees[normalizedDexName] || 0.003;
  }
  
  /**
   * Get gas fee for a specific network
   * @param network Network name (ethereum, solana, etc.)
   * @returns Gas fee in USD
   */
  public async getGasFee(network: string): Promise<number> {
    await this.refreshCache();
    
    const normalizedNetwork = network.toLowerCase();
    
    // Return from cache if available
    if (this.gasFeeCache.has(normalizedNetwork)) {
      return this.gasFeeCache.get(normalizedNetwork) || 0.005;
    }
    
    // Default gas fees for common networks if not in database
    const defaultGasFees: Record<string, number> = {
      'ethereum': 0.005,
      'polygon': 0.001,
      'bnb': 0.0005,
      'arbitrum': 0.002,
      'optimism': 0.001,
      'base': 0.001,
      'solana': 0.00001
    };
    
    return defaultGasFees[normalizedNetwork] || 0.005;
  }
  
  /**
   * Calculate platform fee for a trade
   * @param tradeAmount Amount being traded in USD
   * @returns Platform fee in USD
   */
  public calculatePlatformFee(tradeAmount: number): number {
    return (this.PLATFORM_FEE_PERCENTAGE / 100) * tradeAmount;
  }
  
  /**
   * Calculate all fees for a trade
   * @param tradeAmount Amount being traded in USD
   * @param dexName1 First DEX name
   * @param dexName2 Second DEX name (for arbitrage)
   * @param network Blockchain network
   * @returns Object with fee breakdowns
   */
  public async calculateAllFees(
    tradeAmount: number,
    dexName1: string,
    dexName2: string,
    network: string
  ): Promise<FeeEstimate> {
    const [dex1Fee, dex2Fee, gasFee] = await Promise.all([
      this.getTradingFee(dexName1),
      this.getTradingFee(dexName2),
      this.getGasFee(network)
    ]);
    
    const tradingFee = (dex1Fee * tradeAmount) + (dex2Fee * tradeAmount);
    const platformFee = this.calculatePlatformFee(tradeAmount);
    
    return {
      tradingFee,
      platformFee,
      gasFee,
      totalFee: tradingFee + platformFee + gasFee
    };
  }
}
