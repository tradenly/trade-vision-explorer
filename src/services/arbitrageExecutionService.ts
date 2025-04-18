
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/dexService';
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '@/services/dex/types';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';

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
    
    // Call edge function to execute the trade
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        opportunity,
        walletAddress,
        investmentAmount,
        slippageTolerance,
        network: opportunity.network
      }
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
      
      // General execution error
      return {
        status: TransactionStatus.ERROR,
        error: data.error || 'Trade execution failed',
        details: data.details
      };
    }
    
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
    // Call edge function to check token approval
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
    
    return data.isApproved;
  } catch (error) {
    console.error('Error checking token approval:', error);
    return false;
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
