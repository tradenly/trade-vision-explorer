
import { ArbitrageOpportunity } from '@/services/dexService';
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '../types';
import { supabase } from '@/lib/supabaseClient';
import { FeeService } from './FeeService';
import { LiquidityValidationService } from './LiquidityValidationService';
import { PriceImpactService } from './PriceImpactService';

export interface TradeResult {
  status: TransactionStatus;
  txHash?: string;
  details?: any;
  error?: string;
}

export class TradeExecutionService {
  private static instance: TradeExecutionService;
  private feeService: FeeService;
  private liquidityService: LiquidityValidationService;
  private priceImpactService: PriceImpactService;

  private constructor() {
    this.feeService = FeeService.getInstance();
    this.liquidityService = LiquidityValidationService.getInstance();
    this.priceImpactService = PriceImpactService.getInstance();
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
      const validationResult = await this.validateTrade(
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
        const needsApproval = await this.checkTokenApproval(
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
              spenderAddress: this.getRouterAddress(opportunity.buyDex, opportunity.network)
            }
          };
        }
      }

      // Step 3: Execute the trade via edge function
      const { data, error } = await supabase.functions.invoke('execute-trade', {
        body: {
          opportunity,
          walletAddress,
          investmentAmount,
          slippageTolerance
        }
      });

      if (error || !data.success) {
        console.error('Trade execution failed:', error || data.error);
        return {
          status: TransactionStatus.ERROR,
          error: error?.message || data?.error || 'Failed to execute trade',
          details: data?.details
        };
      }

      // Step 4: Track successful execution
      await this.trackTradeExecution(
        opportunity,
        walletAddress,
        investmentAmount,
        data.txHash,
        data.details
      );

      return {
        status: TransactionStatus.SUCCESS,
        txHash: data.txHash,
        details: data.details
      };
    } catch (error) {
      console.error('Error executing arbitrage trade:', error);
      return {
        status: TransactionStatus.ERROR,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Validate a trade before execution
   */
  private async validateTrade(
    opportunity: ArbitrageOpportunity,
    investmentAmount: number,
    walletAddress: string,
    slippageTolerance: number
  ): Promise<{ 
    isValid: boolean;
    error?: string;
    details?: any;
  }> {
    // Check for sufficient liquidity
    const liquidity = await this.liquidityService.validateArbitrageRoute(
      opportunity.baseToken,
      opportunity.quoteToken,
      opportunity.buyDex,
      opportunity.sellDex,
      investmentAmount
    );

    if (!liquidity.isValid) {
      return {
        isValid: false,
        error: 'Insufficient liquidity for this trade',
        details: {
          insufficientLiquidity: true,
          buyLiquidity: liquidity.buyLiquidity.availableLiquidity,
          sellLiquidity: liquidity.sellLiquidity.availableLiquidity,
          requiredLiquidity: investmentAmount * 3 // 3x coverage for safety
        }
      };
    }

    // Check if price impact is too high
    const buyPriceImpact = liquidity.buyLiquidity.priceImpact;
    const sellPriceImpact = liquidity.sellLiquidity.priceImpact;

    if (buyPriceImpact > 5 || sellPriceImpact > 5) {
      return {
        isValid: false,
        error: 'Price impact too high',
        details: {
          highPriceImpact: true,
          buyPriceImpact,
          sellPriceImpact,
          maxAcceptablePriceImpact: 5
        }
      };
    }

    // Check if the opportunity is still profitable
    const effectiveBuyPrice = this.priceImpactService.getEffectiveBuyPrice(
      opportunity.buyPrice,
      buyPriceImpact
    );
    const effectiveSellPrice = this.priceImpactService.getEffectiveSellPrice(
      opportunity.sellPrice,
      sellPriceImpact
    );

    // If price difference has decreased below slippage tolerance, abort
    const priceDifference = ((effectiveSellPrice - effectiveBuyPrice) / effectiveBuyPrice) * 100;
    if (priceDifference < slippageTolerance) {
      return {
        isValid: false,
        error: 'Price difference below slippage tolerance',
        details: {
          highSlippage: true,
          priceDifference,
          slippageTolerance
        }
      };
    }

    return { isValid: true };
  }

  /**
   * Check if token approval is needed
   */
  private async checkTokenApproval(
    token: TokenInfo,
    walletAddress: string,
    network: string
  ): Promise<boolean> {
    try {
      // Query database for existing approvals
      const { data: existingApproval } = await supabase
        .from('token_approvals')
        .select('*')
        .eq('token_address', token.address.toLowerCase())
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingApproval && existingApproval.length > 0) {
        return false; // Already approved
      }

      // If no record in database, check on-chain via edge function
      const { data, error } = await supabase.functions.invoke('check-token-approval', {
        body: {
          tokenAddress: token.address,
          walletAddress,
          spenderAddress: this.getRouterAddress(token.symbol, network),
          network
        }
      });

      if (error || !data) {
        console.error('Error checking token approval:', error);
        return true; // Assume approval needed if check fails
      }

      return !data.isApproved;
    } catch (error) {
      console.error('Error checking token approval:', error);
      return true; // Assume approval needed if check fails
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
    try {
      const spenderAddress = this.getRouterAddress(token.symbol, network);
      
      console.log(`Requesting approval for ${token.symbol} to spender ${spenderAddress}`);
      
      // Call edge function to handle approval
      const { data, error } = await supabase.functions.invoke('approve-token', {
        body: {
          tokenAddress: token.address,
          spenderAddress,
          walletAddress,
          network
        }
      });

      if (error || !data.success) {
        return {
          status: TransactionStatus.ERROR,
          error: error?.message || data?.error || 'Failed to approve token'
        };
      }

      // Track approval in database
      await supabase.from('token_approvals').insert({
        wallet_address: walletAddress,
        token_address: token.address,
        spender_address: spenderAddress,
        amount: 'unlimited',
        tx_hash: data.txHash,
        status: 'completed'
      });

      return {
        status: TransactionStatus.SUCCESS,
        txHash: data.txHash,
        details: data.details
      };
    } catch (error) {
      console.error('Error approving token:', error);
      return {
        status: TransactionStatus.ERROR,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Track trade execution in database
   */
  private async trackTradeExecution(
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
   * Get router contract address for DEX
   */
  private getRouterAddress(dexOrToken: string, network: string): string {
    const routerAddresses: Record<string, Record<string, string>> = {
      ethereum: {
        uniswap: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        // Add more DEX addresses here
      },
      arbitrum: {
        uniswap: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      },
      polygon: {
        quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      },
      bnb: {
        pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      },
      // Add more networks and DEXes as needed
    };
    
    // If a token name is provided, return a default router for the network
    if (!routerAddresses[network]) {
      return '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Default to Uniswap v2
    }
    
    const dexName = dexOrToken.toLowerCase();
    const networkRouters = routerAddresses[network];
    
    return networkRouters[dexName] || Object.values(networkRouters)[0];
  }
}
