
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
  platformFee: number; // Tradenly's 0.5% fee
  liquidity: number; // Available liquidity
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: any;
}

// Default gas fees by network (used as fallback)
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

// Main function to scan for arbitrage opportunities using Edge Function
export async function scanForArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  investmentAmount: number = 1000,
  minProfitPercentage: number = 0.5
): Promise<ArbitrageOpportunity[]> {
  try {
    console.log(`Scanning for arbitrage opportunities: ${baseToken.symbol}/${quoteToken.symbol}`);
    
    // Call Edge Function to scan for arbitrage
    const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
      body: { 
        baseToken, 
        quoteToken, 
        investmentAmount, 
        minProfitPercentage 
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data || !data.opportunities) {
      console.error('Invalid response from edge function:', data);
      return [];
    }

    console.log(`Found ${data.opportunities.length} opportunities`);
    return data.opportunities || [];
  } catch (error) {
    console.error('Error scanning for arbitrage opportunities:', error);
    return [];
  }
}

// Execute a trade for an arbitrage opportunity using Edge Function
export async function executeTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string
): Promise<TradeResult> {
  try {
    console.log(`Executing trade for ${opportunity.tokenPair} with wallet ${walletAddress}`);
    
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

// Get DEX settings from Supabase
export async function getDexSettings() {
  try {
    const { data, error } = await supabase
      .from('dex_settings')
      .select('*')
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching DEX settings:', error);
    return [];
  }
}

// Update DEX settings in Supabase
export async function updateDexSetting(slug: string, enabled: boolean) {
  try {
    const { error } = await supabase
      .from('dex_settings')
      .update({ enabled })
      .eq('slug', slug);
      
    if (error) throw error;
    
    // Also update local registry
    const dexRegistry = DexRegistry.getInstance();
    dexRegistry.updateDexConfig(slug, enabled);
    
    return true;
  } catch (error) {
    console.error('Error updating DEX setting:', error);
    return false;
  }
}

// Get user settings
export async function getUserSettings(walletAddress: string) {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      throw error;
    }
    
    return data || {
      min_profit_percentage: 0.5,
      scan_interval: 30,
      wallet_address: walletAddress,
      preferred_chains: [1, 56, 101], // Default to all chains
      created_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return {
      min_profit_percentage: 0.5, 
      scan_interval: 30,
      wallet_address: walletAddress,
      preferred_chains: [1, 56, 101]
    };
  }
}

// Save user settings
export async function saveUserSettings(
  walletAddress: string, 
  settings: {
    min_profit_percentage: number,
    scan_interval: number,
    preferred_chains: number[]
  }
) {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        wallet_address: walletAddress,
        min_profit_percentage: settings.min_profit_percentage,
        scan_interval: settings.scan_interval,
        preferred_chains: settings.preferred_chains
      });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving user settings:', error);
    return false;
  }
}
