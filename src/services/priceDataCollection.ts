
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from './tokenListService';
import { PriceQuote } from './dex/types';

/**
 * Fetches and stores price data for a token pair across different DEXes
 */
export async function fetchAndStorePriceData(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): Promise<Record<string, PriceQuote>> {
  try {
    // Call the Supabase Edge Function to fetch and store prices
    const { data, error } = await supabase.functions.invoke('update-price-data', {
      body: { 
        tokenPairs: [{ baseToken, quoteToken }],
        chainId: baseToken.chainId
      }
    });

    if (error) {
      console.error('Error fetching price data:', error);
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }

    // Now query the database for the latest prices for this token pair
    const { data: prices } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
      .eq('chain_id', baseToken.chainId)
      .order('timestamp', { ascending: false });

    // Convert database records to PriceQuote format
    const priceQuotes: Record<string, PriceQuote> = {};
    
    if (prices && prices.length > 0) {
      // Group by DEX and take the most recent entry
      const dexPrices = new Map<string, any>();
      prices.forEach(price => {
        if (!dexPrices.has(price.dex_name)) {
          dexPrices.set(price.dex_name, price);
        }
      });

      // Convert to PriceQuote format
      dexPrices.forEach((price, dexName) => {
        priceQuotes[dexName] = {
          dexName: dexName,
          price: price.price,
          fees: getDexFee(dexName),
          gasEstimate: getGasEstimate(baseToken.chainId, dexName),
          liquidityUSD: price.liquidity || 100000,
          timestamp: price.timestamp
        };
      });
    }

    console.log(`Fetched ${Object.keys(priceQuotes).length} price quotes for ${baseToken.symbol}/${quoteToken.symbol}`);
    return priceQuotes;
  } catch (error) {
    console.error('Error in fetchAndStorePriceData:', error);
    return {};
  }
}

/**
 * Find arbitrage opportunities for a token pair
 */
export async function findArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
): Promise<any[]> {
  try {
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol}, min profit: ${minProfitPercentage}%, investment: $${investmentAmount}`);
    
    // Call the Supabase Edge Function to scan for arbitrage
    const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
      body: { 
        baseToken, 
        quoteToken, 
        minProfitPercentage,
        investmentAmount
      }
    });

    if (error) {
      console.error('Error scanning for arbitrage:', error);
      throw new Error(`Failed to scan for arbitrage: ${error.message}`);
    }

    console.log(`Found ${data.opportunities?.length || 0} arbitrage opportunities`);
    return data.opportunities || [];
  } catch (error) {
    console.error('Error in findArbitrageOpportunities:', error);
    return [];
  }
}

/**
 * Get trading fee for a specific DEX
 */
function getDexFee(dexName: string): number {
  const fees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    'balancer': 0.002, // 0.2%
    'curve': 0.0004 // 0.04%
  };

  return fees[dexName.toLowerCase()] || 0.003; // Default to 0.3%
}

/**
 * Estimate gas cost based on chain and DEX
 */
function getGasEstimate(chainId: number, dexName: string): number {
  // Base gas estimates by chain
  const chainGasBase: Record<number, number> = {
    1: 0.005, // Ethereum
    56: 0.0005, // BSC
    137: 0.001, // Polygon
    101: 0.00001 // Solana
  };

  // Multipliers by DEX (relative to base)
  const dexMultipliers: Record<string, number> = {
    'uniswap': 1.0,
    'sushiswap': 1.1,
    'curve': 0.8, // More gas efficient
    'balancer': 1.2,
    'jupiter': 1.0,
    'orca': 1.0,
    'raydium': 1.0,
    'pancakeswap': 0.9 // Slightly more efficient on BSC
  };

  const baseGas = chainGasBase[chainId] || 0.003;
  const multiplier = dexMultipliers[dexName.toLowerCase()] || 1.0;

  return baseGas * multiplier;
}
