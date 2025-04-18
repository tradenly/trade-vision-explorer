
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '../types';
import { supabase } from '@/lib/supabaseClient';
import { TradeValidationService } from './TradeValidationService';
import { TokenApprovalService } from './TokenApprovalService';
import { TradeExecutionTrackingService } from './TradeExecutionTrackingService';

export interface TradeResult {
  status: TransactionStatus;
  txHash?: string;
  details?: any;
  error?: string;
}

/**
 * Main service for executing trades
 */
export class TradeExecutionService {
  private static instance: TradeExecutionService;
  private validationService: TradeValidationService;
  private approvalService: TokenApprovalService;
  private trackingService: TradeExecutionTrackingService;

  private constructor() {
    this.validationService = TradeValidationService.getInstance();
    this.approvalService = TokenApprovalService.getInstance();
    this.trackingService = TradeExecutionTrackingService.getInstance();
  }

  public static getInstance(): TradeExecutionService {
    if (!TradeExecutionService.instance) {
      TradeExecutionService.instance = new TradeExecutionService();
    }
    return TradeExecutionService.instance;
  }

  /**
   * Execute an arbitrage trade
   */
  public async executeArbitrageTrade(
    opportunity: ArbitrageOpportunity,
    walletAddress: string,
    investmentAmount: number,
    slippageTolerance: number = 0.5
  ): Promise<TradeResult> {
    try {
      console.log(`Executing arbitrage trade for ${opportunity.tokenPair}`);
      console.log(`Using wallet: ${walletAddress}`);
      console.log(`Investment amount: $${investmentAmount}, slippage: ${slippageTolerance}%`);

      // Validate wallet connection
      if (!walletAddress) {
        return {
          status: TransactionStatus.ERROR,
          error: 'Wallet not connected'
        };
      }

      // Step 1: Pre-trade validation
      const validationResult = await this.validationService.validateTrade(
        opportunity,
        investmentAmount,
        walletAddress,
        slippageTolerance
      );

      if (!validationResult.isValid) {
        return {
          status: TransactionStatus.ERROR,
          error: validationResult.error,
          details: validationResult.details
        };
      }

      // Step 2: Check token approval (for EVM chains only)
      if (opportunity.network !== 'solana') {
        const needsApproval = await this.approvalService.checkTokenApproval(
          opportunity.baseToken,
          walletAddress,
          opportunity.network
        );

        if (needsApproval) {
          return {
            status: TransactionStatus.NEEDS_APPROVAL,
            error: 'Token approval required',
            details: {
              needsAllowance: true,
              tokenAddress: opportunity.baseToken.address,
              spenderAddress: this.getSpenderAddress(opportunity.buyDex, opportunity.network)
            }
          };
        }
      }

      // Step 3: Execute the trade via edge function
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: {
          opportunity,
          walletAddress,
          investmentAmount,
          slippageTolerance
        }
      });
      const executionTime = Date.now() - startTime;

      if (error || !data.success) {
        console.error('Trade execution failed:', error || data.error);
        
        // Track the failed trade
        await this.trackingService.trackFailedTrade(
          opportunity, 
          walletAddress,
          error?.message || data?.error || 'Failed to execute trade',
          executionTime
        );
        
        return {
          status: TransactionStatus.ERROR,
          error: error?.message || data?.error || 'Failed to execute trade',
          details: data?.details
        };
      }

      // Step 4: Track successful execution
      await this.trackingService.trackTradeExecution(
        opportunity,
        walletAddress,
        investmentAmount,
        data.txHash,
        { ...data.details, executionTime }
      );

      return {
        status: TransactionStatus.SUCCESS,
        txHash: data.txHash,
        details: { ...data.details, executionTime }
      };
    } catch (error) {
      console.error('Error executing arbitrage trade:', error);
      
      // Track unexpected error
      if (opportunity) {
        await this.trackingService.trackFailedTrade(
          opportunity,
          walletAddress,
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
      
      return {
        status: TransactionStatus.ERROR,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Execute token approval transaction
   */
  public async approveToken(
    token: TokenInfo,
    walletAddress: string,
    network: string
  ): Promise<TradeResult> {
    return this.approvalService.approveToken(token, walletAddress, network);
  }
  
  /**
   * Get spender address for a DEX
   */
  private getSpenderAddress(dex: string, network: string): string {
    return this.approvalService['getRouterAddress'](dex, network);
  }
}
