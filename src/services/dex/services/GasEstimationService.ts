
import { supabase } from '@/lib/supabaseClient';

export interface GasEstimate {
  baseFee: number;
  priorityFee: number;
  totalGasEstimateUsd: number;
}

export class GasEstimationService {
  private static instance: GasEstimationService;
  private gasCache: Map<string, GasEstimate> = new Map();
  private lastUpdateTime: Map<string, number> = new Map();
  private cacheValidityPeriod = 60000; // 1 minute

  private constructor() {}

  public static getInstance(): GasEstimationService {
    if (!GasEstimationService.instance) {
      GasEstimationService.instance = new GasEstimationService();
    }
    return GasEstimationService.instance;
  }

  /**
   * Get current gas prices for a network
   */
  public async getGasEstimate(networkName: string): Promise<GasEstimate> {
    const network = networkName.toLowerCase();
    const cacheKey = `gas_${network}`;
    const now = Date.now();
    
    // Check if we have a valid cached value
    if (
      this.gasCache.has(cacheKey) &&
      this.lastUpdateTime.has(cacheKey) &&
      now - this.lastUpdateTime.get(cacheKey)! < this.cacheValidityPeriod
    ) {
      return this.gasCache.get(cacheKey)!;
    }

    try {
      // Fetch from database
      const { data, error } = await supabase
        .from('gas_fees')
        .select('*')
        .eq('network', network)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        const gasData = data[0];
        const estimate: GasEstimate = {
          baseFee: gasData.base_fee,
          priorityFee: gasData.priority_fee || 0,
          totalGasEstimateUsd: this.calculateTotalGasEstimate(network, gasData.base_fee, gasData.priority_fee)
        };

        // Update cache
        this.gasCache.set(cacheKey, estimate);
        this.lastUpdateTime.set(cacheKey, now);
        
        return estimate;
      }
      
      // Fallback to defaults if no data is found
      return this.getDefaultGasEstimate(network);

    } catch (error) {
      console.error(`Error fetching gas fees for ${network}:`, error);
      return this.getDefaultGasEstimate(network);
    }
  }

  /**
   * Get the estimated gas fee for a specific operation type on a network
   */
  public async getOperationGasEstimate(networkName: string, operationType: 'swap' | 'approval' | 'transfer'): Promise<number> {
    const gasEstimate = await this.getGasEstimate(networkName);
    const gasUnits = this.estimateGasUnits(networkName, operationType);
    
    // For Solana, handle differently as it uses compute units/lamports
    if (networkName.toLowerCase() === 'solana') {
      return gasEstimate.totalGasEstimateUsd;
    }
    
    // For EVM chains
    return (gasEstimate.baseFee + gasEstimate.priorityFee) * gasUnits * 1e-9; // Convert from Gwei
  }

  /**
   * Default gas estimates by network
   */
  private getDefaultGasEstimate(network: string): GasEstimate {
    const networkGasDefaults: Record<string, GasEstimate> = {
      'ethereum': {
        baseFee: 20,
        priorityFee: 2,
        totalGasEstimateUsd: 5.0
      },
      'polygon': {
        baseFee: 100,
        priorityFee: 30,
        totalGasEstimateUsd: 0.5
      },
      'bnb': {
        baseFee: 5,
        priorityFee: 1,
        totalGasEstimateUsd: 0.3
      },
      'arbitrum': {
        baseFee: 0.1,
        priorityFee: 0.05,
        totalGasEstimateUsd: 0.4
      },
      'optimism': {
        baseFee: 0.001,
        priorityFee: 0.0005,
        totalGasEstimateUsd: 0.3
      },
      'base': {
        baseFee: 0.005,
        priorityFee: 0.001,
        totalGasEstimateUsd: 0.2
      },
      'solana': {
        baseFee: 0.000005,
        priorityFee: 0,
        totalGasEstimateUsd: 0.0002
      }
    };

    return networkGasDefaults[network.toLowerCase()] || networkGasDefaults['ethereum'];
  }

  /**
   * Calculate total gas estimate in USD based on network and gas price
   */
  private calculateTotalGasEstimate(network: string, baseFee: number, priorityFee: number): number {
    const gasUnits = this.estimateGasUnits(network, 'swap');
    
    // Native token prices (approximate)
    const tokenPrices: Record<string, number> = {
      'ethereum': 3500,
      'polygon': 1.5,
      'bnb': 550,
      'arbitrum': 3500, // Uses ETH
      'optimism': 3500, // Uses ETH
      'base': 3500,     // Uses ETH
      'solana': 150
    };
    
    const tokenPrice = tokenPrices[network.toLowerCase()] || 3500;
    
    // Special case for Solana which uses lamports
    if (network.toLowerCase() === 'solana') {
      return baseFee * tokenPrice;
    }
    
    // For EVM chains
    return (baseFee + priorityFee) * gasUnits * tokenPrice * 1e-9; // Convert from Gwei
  }

  /**
   * Estimate gas units for different operation types
   */
  private estimateGasUnits(network: string, operationType: 'swap' | 'approval' | 'transfer'): number {
    if (network.toLowerCase() === 'solana') {
      // Solana uses compute units, which are priced differently
      return operationType === 'swap' ? 200000 : 
             operationType === 'approval' ? 100000 : 50000;
    }
    
    // EVM gas units
    switch (operationType) {
      case 'swap':
        return 150000;
      case 'approval':
        return 60000;
      case 'transfer':
        return 21000;
      default:
        return 100000;
    }
  }
}
