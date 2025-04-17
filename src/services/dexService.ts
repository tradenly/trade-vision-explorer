import { supabase } from '../lib/supabaseClient';
import { TokenInfo } from './tokenListService';
import { TransactionStatus } from './dex/types';

export interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  tokenPair: string;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  tradingFees: number;
  gasFee: number;
  platformFee: number;
  liquidity?: number;
  network: string;
  token?: string;
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  status?: TransactionStatus;
  details?: any;
  needsApproval?: boolean;
}

// Function to scan for arbitrage opportunities
export async function scanForArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  investmentAmount: number = 1000,
  minProfitPercentage: number = 0.5
): Promise<ArbitrageOpportunity[]> {
  try {
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} with $${investmentAmount}`);
    console.log(`Chain ID: ${baseToken.chainId}, Network: ${getNetworkFromChainId(baseToken.chainId)}`);
    
    // Add timestamp to cache bust and handle rate limiting
    const timestamp = Date.now();
    
    // Call the Supabase Edge Function to scan for arbitrage
    const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
      body: {
        baseToken,
        quoteToken,
        investmentAmount,
        minProfitPercentage,
        _t: timestamp // Add timestamp to prevent caching
      },
    });

    if (error) {
      console.error('Error invoking scan-arbitrage function:', error);
      throw new Error(`Failed to scan for arbitrage: ${error.message}`);
    }

    console.log('Arbitrage scan results:', data);
    
    // Process the opportunities to ensure they have the correct structure
    const opportunities = (data?.opportunities || []).map((opp: any, index: number) => ({
      id: opp.id || `opp-${index}-${Date.now()}`,
      buyDex: opp.buyDex,
      sellDex: opp.sellDex,
      buyPrice: opp.buyPrice,
      sellPrice: opp.sellPrice,
      tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
      estimatedProfit: parseFloat(opp.netProfit) || 0,
      estimatedProfitPercentage: opp.profitPercentage || 0,
      tradingFees: (opp.tradingFeeBuy || 0) + (opp.tradingFeeSell || 0),
      gasFee: opp.gasFee || 0,
      platformFee: investmentAmount * 0.005, // 0.5% platform fee
      liquidity: Math.min(opp.liquidityBuy || 1000000, opp.liquiditySell || 1000000),
      liquidityBuy: opp.liquidityBuy,
      liquiditySell: opp.liquiditySell,
      network: opp.network || getNetworkFromChainId(baseToken.chainId),
      token: baseToken.symbol
    }));

    return opportunities;
  } catch (error) {
    console.error('Error scanning for arbitrage:', error);
    throw error;
  }
}

// Function to execute a trade
export async function executeTrade(
  opportunity: ArbitrageOpportunity, 
  walletAddress: string,
  amount: number = 1000
): Promise<TradeResult> {
  try {
    // Add logging to track execution process
    console.log(`Executing trade for ${opportunity.tokenPair} on ${opportunity.network}`);
    console.log(`Buy on ${opportunity.buyDex} at ${opportunity.buyPrice}, sell on ${opportunity.sellDex} at ${opportunity.sellPrice}`);
    console.log(`Using wallet: ${walletAddress}`);
    
    // Call the execute-trade Edge Function
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: {
        opportunity,
        walletAddress,
        investmentAmount: amount
      },
    });

    if (error) {
      console.error('Error executing trade:', error);
      return {
        success: false,
        error: error.message,
        status: TransactionStatus.ERROR
      };
    }

    // If the trade execution returned an error message (in data, not in the HTTP error)
    if (data && !data.success) {
      console.warn('Trade execution returned error:', data.error);
      
      // Check if this is a token approval issue
      if (data.details?.needsAllowance) {
        return {
          success: false,
          error: data.error || 'Token approval required',
          status: TransactionStatus.NEEDS_APPROVAL,
          needsApproval: true,
          details: data.details
        };
      }
      
      return {
        success: false,
        error: data.error || 'Failed to execute trade',
        status: TransactionStatus.ERROR,
        details: data.details
      };
    }

    console.log('Trade executed successfully:', data);
    
    return {
      success: true,
      txHash: data?.txHash,
      status: TransactionStatus.SUCCESS,
      // Add additional data returned from the function
      ...(data || {})
    };
  } catch (error) {
    console.error('Error executing trade:', error);
    return {
      success: false,
      status: TransactionStatus.ERROR,
      error: error instanceof Error ? error.message : 'Unknown error executing trade'
    };
  }
}

// Function to approve token for trading (for when allowance check fails)
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  walletAddress: string,
  chainId: number
): Promise<TradeResult> {
  try {
    console.log(`Approving token ${tokenAddress} for spender ${spenderAddress} on chain ${chainId}`);
    
    // In a real implementation, this would call a contract method to approve
    // For now, we'll return a simulated successful result
    
    // Simulate approval transaction
    const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    return {
      success: true,
      txHash,
      status: TransactionStatus.SUCCESS
    };
  } catch (error) {
    console.error('Error approving token:', error);
    return {
      success: false,
      status: TransactionStatus.ERROR,
      error: error instanceof Error ? error.message : 'Failed to approve token'
    };
  }
}

// Helper function to get network name from chain ID
export function getNetworkFromChainId(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'ethereum';
    case 56:
      return 'bnb';
    case 101:
      return 'solana';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 10:
      return 'optimism';
    case 8453:
      return 'base';
    default:
      return 'unknown';
  }
}

// Helper function to estimate gas price on a given network
export async function estimateGasFee(network: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('gas_fees')
      .select('*')
      .eq('network', network)
      .single();
      
    if (error) {
      console.error(`Error fetching gas fees for ${network}:`, error);
      // Default values based on network
      if (network === 'ethereum') return 10; // $10 for ETH mainnet
      if (network === 'solana') return 0.01; // $0.01 for Solana
      return 2; // $2 default for other networks
    }
    
    // Calculate gas fee based on base fee from DB
    if (network === 'ethereum') {
      return data.base_fee * 0.00021 * 3500; // 210000 gas * gwei price * ETH price
    } else if (network === 'solana') {
      return data.base_fee; // Solana fees are already in USD
    } else {
      return data.base_fee * 0.00021 * 1000; // Lower gas cost for L2s and sidechains
    }
  } catch (error) {
    console.error(`Error estimating gas for ${network}:`, error);
    return network === 'ethereum' ? 10 : 2; // Default fallback
  }
}
