
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/dexService';
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '@/services/dex/types';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';
import { GasEstimationService } from './dex/services/GasEstimationService';

export interface ExecutionResult {
  status: TransactionStatus;
  txHash?: string;
  error?: string;
  details?: any;
}

/**
 * Execute an arbitrage trade using the connected wallet
 */
export async function executeArbitrageTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string,
  investmentAmount: number = 1000,
  slippageTolerance: number = 0.5
): Promise<ExecutionResult> {
  try {
    console.log(`Executing arbitrage trade for ${opportunity.tokenPair}`);
    console.log(`Using wallet: ${walletAddress}`);
    console.log(`Investment amount: $${investmentAmount}, slippage tolerance: ${slippageTolerance}%`);
    
    // Get current gas estimates
    const gasService = GasEstimationService.getInstance();
    const currentGasPrice = await gasService.getGasEstimate(opportunity.network);
    
    // Add gas price to the request for better accuracy
    const executionRequest = {
      opportunity,
      walletAddress,
      investmentAmount,
      slippageTolerance,
      network: opportunity.network,
      currentGasPrice: {
        baseFee: currentGasPrice.baseFee,
        priorityFee: currentGasPrice.priorityFee
      }
    };
    
    // Call edge function to execute the trade
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: executionRequest
    });
    
    if (error) {
      console.error('Error executing trade:', error);
      return {
        status: TransactionStatus.ERROR,
        error: error.message || 'Failed to execute trade'
      };
    }
    
    if (!data.success) {
      // Check if the trade needs token approval
      if (data.details?.needsAllowance) {
        return {
          status: TransactionStatus.NEEDS_APPROVAL,
          error: data.error || 'Token approval required',
          details: data.details
        };
      }
      
      // Check if slippage was too high
      if (data.details?.highSlippage) {
        return {
          status: TransactionStatus.ERROR,
          error: `Slippage too high: ${data.details.slippage.toFixed(2)}% exceeds tolerance of ${slippageTolerance}%`,
          details: data.details
        };
      }
      
      // Price impact too high
      if (data.details?.highPriceImpact) {
        return {
          status: TransactionStatus.ERROR,
          error: `Price impact too high: ${data.details.priceImpact.toFixed(2)}%`,
          details: data.details
        };
      }
      
      // Insufficient liquidity
      if (data.details?.insufficientLiquidity) {
        return {
          status: TransactionStatus.ERROR,
          error: `Insufficient liquidity: ${data.details.availableLiquidity.toFixed(2)} is less than required ${investmentAmount.toFixed(2)}`,
          details: data.details
        };
      }
      
      // General execution error
      return {
        status: TransactionStatus.ERROR,
        error: data.error || 'Trade execution failed',
        details: data.details
      };
    }
    
    // Track successful execution
    await trackTradeExecution(
      opportunity,
      walletAddress,
      investmentAmount,
      data.txHash,
      data.details
    );
    
    // Success case
    return {
      status: TransactionStatus.SUCCESS,
      txHash: data.txHash,
      details: data.details
    };
  } catch (error) {
    console.error('Unexpected error executing trade:', error);
    return {
      status: TransactionStatus.ERROR,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Execute token approval transaction if needed
 */
export async function executeTokenApproval(
  token: TokenInfo,
  spenderAddress: string,
  walletAddress: string,
  chainId: number
): Promise<ExecutionResult> {
  try {
    console.log(`Requesting token approval for ${token.symbol}`);
    
    // Call edge function to handle token approval
    const { data, error } = await supabase.functions.invoke('approve-token', {
      body: {
        tokenAddress: token.address,
        spenderAddress,
        walletAddress,
        chainId
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
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Verify token approval status
 */
export async function checkTokenApproval(
  token: TokenInfo,
  spenderAddress: string,
  walletAddress: string,
  chainId: number
): Promise<boolean> {
  try {
    // Check database first for cached approvals
    const { data: existingApprovals } = await supabase
      .from('token_approvals')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('token_address', token.address)
      .eq('spender_address', spenderAddress)
      .eq('status', 'completed')
      .limit(1);
      
    if (existingApprovals && existingApprovals.length > 0) {
      console.log(`Found existing approval in database for ${token.symbol}`);
      return true;
    }
    
    // If not found in database, check on-chain
    const { data, error } = await supabase.functions.invoke('check-token-approval', {
      body: {
        tokenAddress: token.address,
        spenderAddress,
        walletAddress,
        chainId
      }
    });
    
    if (error) {
      console.error('Error checking token approval:', error);
      return false;
    }
    
    // If approved, cache the result
    if (data.isApproved) {
      await supabase.from('token_approvals').insert({
        wallet_address: walletAddress,
        token_address: token.address,
        spender_address: spenderAddress,
        amount: 'unlimited',
        status: 'completed'
      });
    }
    
    return data.isApproved;
  } catch (error) {
    console.error('Error checking token approval:', error);
    return false;
  }
}

/**
 * Track trade execution in the database
 */
async function trackTradeExecution(
  opportunity: ArbitrageOpportunity,
  walletAddress: string,
  investmentAmount: number,
  txHash: string,
  details: any
): Promise<void> {
  try {
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
      fee_amount: opportunity.tradingFees + opportunity.platformFee + opportunity.gasFee,
      details: {
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        buyPrice: opportunity.buyPrice,
        sellPrice: opportunity.sellPrice,
        profit: opportunity.netProfit,
        profitPercentage: opportunity.netProfitPercentage
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
 * Custom hook for using wallet connections based on chain type
 */
export function useWalletForArbitrage(network: string) {
  const { address: evmAddress, isConnected: isEvmConnected } = useEthereumWallet();
  const { address: solanaAddress, isConnected: isSolanaConnected } = useSolanaWallet();
  
  const isSolanaNetwork = network.toLowerCase() === 'solana';
  
  return {
    address: isSolanaNetwork ? solanaAddress : evmAddress,
    isConnected: isSolanaNetwork ? isSolanaConnected : isEvmConnected,
    walletType: isSolanaNetwork ? 'solana' : 'evm'
  };
}
