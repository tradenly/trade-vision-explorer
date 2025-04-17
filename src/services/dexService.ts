
import { supabase } from '../lib/supabaseClient';
import { TokenInfo } from './tokenListService';

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
    
    // Call the Supabase Edge Function to scan for arbitrage
    const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
      body: {
        baseToken,
        quoteToken,
        investmentAmount,
        minProfitPercentage
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
  walletAddress: string
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
        walletAddress
      },
    });

    if (error) {
      console.error('Error executing trade:', error);
      return {
        success: false,
        error: error.message
      };
    }

    console.log('Trade executed successfully:', data);
    
    return {
      success: true,
      txHash: data?.txHash,
      // Add additional data returned from the function
      ...(data || {})
    };
  } catch (error) {
    console.error('Error executing trade:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error executing trade'
    };
  }
}

// Helper function to get network name from chain ID
function getNetworkFromChainId(chainId: number): string {
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
