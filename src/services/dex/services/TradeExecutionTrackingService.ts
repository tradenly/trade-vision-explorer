
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { FeeService } from './FeeService';

/**
 * Service to track trade executions in Supabase
 */
export class TradeExecutionTrackingService {
  private static instance: TradeExecutionTrackingService;
  private feeService: FeeService;

  private constructor() {
    this.feeService = FeeService.getInstance();
  }

  public static getInstance(): TradeExecutionTrackingService {
    if (!TradeExecutionTrackingService.instance) {
      TradeExecutionTrackingService.instance = new TradeExecutionTrackingService();
    }
    return TradeExecutionTrackingService.instance;
  }

  /**
   * Track trade execution in database
   */
  public async trackTradeExecution(
    opportunity: ArbitrageOpportunity,
    walletAddress: string,
    investmentAmount: number,
    txHash: string,
    details: any
  ): Promise<void> {
    try {
      // Calculate our platform fee
      const platformFee = this.feeService.calculatePlatformFee(investmentAmount);
      
      // Insert record into trading_activity table
      const { error: tradeError } = await supabase.from('trading_activity').insert({
        token_pair: opportunity.tokenPair,
        strategy: 'arbitrage',
        type: 'buy_sell',
        status: 'completed',
        tx_hash: txHash,
        network_type: opportunity.network,
        amount: investmentAmount,
        price: opportunity.buyPrice,
        fee_amount: opportunity.tradingFees + platformFee + opportunity.gasFee,
        details: {
          buyDex: opportunity.buyDex,
          sellDex: opportunity.sellDex,
          buyPrice: opportunity.buyPrice,
          sellPrice: opportunity.sellPrice,
          profit: opportunity.netProfit,
          profitPercentage: opportunity.netProfitPercentage,
          platformFee
        }
      });

      if (tradeError) {
        console.error('Error recording trade activity:', tradeError);
      }

      // Insert metrics for analysis
      const { error: metricError } = await supabase.from('trade_metrics').insert({
        success: true,
        profit_percentage: opportunity.netProfitPercentage,
        execution_time_ms: details.executionTime || 0,
        wallet_address: walletAddress
      });

      if (metricError) {
        console.error('Error recording trade metrics:', metricError);
      }
    } catch (error) {
      console.error('Error tracking trade execution:', error);
    }
  }
  
  /**
   * Record failed trade execution
   */
  public async trackFailedTrade(
    opportunity: ArbitrageOpportunity,
    walletAddress: string,
    error: string,
    executionTimeMs: number = 0
  ): Promise<void> {
    try {
      // Insert metrics for analysis
      await supabase.from('trade_metrics').insert({
        success: false,
        profit_percentage: 0,
        execution_time_ms: executionTimeMs,
        wallet_address: walletAddress,
        error: error.substring(0, 255) // Limit error length
      });
    } catch (err) {
      console.error('Error recording failed trade metrics:', err);
    }
  }
}
