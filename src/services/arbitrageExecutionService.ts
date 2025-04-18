
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/dexService';
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '@/services/dex/types';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';
import { TradeExecutionService } from './dex/services/TradeExecutionService';
import { FeeService } from './dex/services/FeeService';
import { PriceImpactService } from './dex/services/PriceImpactService';

/**
 * Execute an arbitrage trade using the connected wallet
 */
export async function executeArbitrageTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string,
  investmentAmount: number = 1000,
  slippageTolerance: number = 0.5
): Promise<{
  status: TransactionStatus;
  error?: string;
  txHash?: string;
  details?: any;
}> {
  try {
    // Use the TradeExecutionService to handle the trade
    const tradeService = TradeExecutionService.getInstance();
    
    return await tradeService.executeArbitrageTrade(
      opportunity,
      walletAddress,
      investmentAmount,
      slippageTolerance
    );
  } catch (error) {
    console.error('Unexpected error executing trade:', error);
    return {
      status: TransactionStatus.ERROR,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

/**
 * Execute token approval transaction if needed
 */
export async function executeTokenApproval(
  token: TokenInfo,
  walletAddress: string,
  network: string
): Promise<{
  status: TransactionStatus;
  error?: string;
  txHash?: string;
  details?: any;
}> {
  try {
    // Use the TradeExecutionService to handle token approval
    const tradeService = TradeExecutionService.getInstance();
    
    return await tradeService.approveToken(
      token,
      walletAddress,
      network
    );
  } catch (error) {
    console.error('Error approving token:', error);
    return {
      status: TransactionStatus.ERROR,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
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

/**
 * Calculate max trade size based on available liquidity
 */
export function calculateMaxTradeSize(liquidity: number): number {
  const priceImpactService = PriceImpactService.getInstance();
  return priceImpactService.calculateMaxTradeSize(liquidity);
}

/**
 * Calculate platform fee for a trade amount
 */
export function calculatePlatformFee(tradeAmount: number): number {
  const feeService = FeeService.getInstance();
  return feeService.calculatePlatformFee(tradeAmount);
}
