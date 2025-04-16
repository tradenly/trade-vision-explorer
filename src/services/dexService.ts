
import { TokenInfo } from './tokenListService';
import { supabase } from '@/lib/supabaseClient';
import DexRegistry from './dex/DexRegistry';
import { PriceQuote } from './dex/types';

export type { PriceQuote } from './dex/types';

export interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  gasFee: number;
  tradingFees: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  network: string;
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

const GAS_FEES: Record<string, number> = {
  ethereum: 5,     // $5 (approximate)
  bnb: 0.25,       // $0.25
  solana: 0.00025  // $0.00025
};

// Get quotes from all supported DEXs for a chain
export async function getQuotesForChain(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  chainId: number
): Promise<PriceQuote[]> {
  try {
    const dexRegistry = DexRegistry.getInstance();
    const adapters = dexRegistry.getAdaptersForChain(chainId);
    
    // Fetch quotes from all relevant DEXs
    const quotePromises = adapters.map(adapter => adapter.fetchQuote(baseToken, quoteToken));
    return await Promise.all(quotePromises);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return [];
  }
}

// Main function to scan for arbitrage opportunities
export async function scanForArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  investmentAmount: number = 1000
): Promise<ArbitrageOpportunity[]> {
  try {
    // Call Edge Function to scan for arbitrage
    const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
      body: { baseToken, quoteToken, investmentAmount },
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    return data.opportunities || [];
  } catch (error) {
    console.error('Error scanning for arbitrage opportunities:', error);
    return [];
  }
}

// Execute a trade for an arbitrage opportunity
export async function executeTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string
): Promise<TradeResult> {
  try {
    // Call Edge Function to execute trade
    const { data, error } = await supabase.functions.invoke('execute-trade', {
      body: { opportunity, walletAddress },
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error executing trade:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}
