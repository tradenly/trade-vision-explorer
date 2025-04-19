
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { TransactionStatus } from '@/services/dex/types';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { useSolanaWallet } from '@/context/SolanaWalletContext';
import { useState, useEffect } from 'react';

/**
 * Executes an arbitrage trade
 */
export async function executeArbitrageTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string,
  investmentAmount: number = 1000,
  slippageTolerance: number = 0.5
) {
  try {
    console.log(`Executing trade: ${opportunity.id} with wallet ${walletAddress}`);
    console.log(`Investment: $${investmentAmount}, slippage: ${slippageTolerance}%`);
    
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        opportunity,
        walletAddress,
        investmentAmount,
        slippageTolerance
      }
    });

    if (error) {
      console.error('Error executing trade:', error);
      return {
        status: TransactionStatus.ERROR,
        error: error.message
      };
    }

    if (!data.success) {
      return {
        status: TransactionStatus.ERROR,
        error: data.error || 'Unknown error'
      };
    }

    return {
      status: TransactionStatus.SUCCESS,
      txHash: data.txHash,
      details: data.details
    };
  } catch (error) {
    console.error('Error in executeArbitrageTrade:', error);
    return {
      status: TransactionStatus.ERROR,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Hook to get the appropriate wallet for an arbitrage opportunity
 */
export function useWalletForArbitrage(network: string) {
  // For EVM chains
  const { 
    address: ethAddress, 
    isConnected: isEthConnected 
  } = useEthereumWallet();
  
  // For Solana
  const {
    publicKey: solAddress,
    connected: isSolConnected
  } = useSolanaWallet();
  
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  useEffect(() => {
    if (network === 'solana') {
      setAddress(solAddress?.toString() || null);
      setIsConnected(isSolConnected);
    } else {
      // Default to EVM wallet for all other networks
      setAddress(ethAddress || null);
      setIsConnected(isEthConnected);
    }
  }, [network, ethAddress, isEthConnected, solAddress, isSolConnected]);
  
  return { address, isConnected };
}
