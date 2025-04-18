
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ArbitrageRequest, PriceData, ArbitrageOpportunity } from './types.ts';
import { getNetworkName } from './utils.ts';
import { findPriceDifferences, getBestPricePair } from './price-comparison.ts';
import { calculateArbitrageProfit } from './profit-calculator.ts';

/**
 * Main function to scan for arbitrage opportunities
 */
export async function scanArbitrageOpportunities(
  supabase: ReturnType<typeof createClient>,
  request: ArbitrageRequest
): Promise<ArbitrageOpportunity[]> {
  const { baseToken, quoteToken, minProfitPercentage = 0.5, investmentAmount = 1000, maxAgeSeconds = 30 } = request;

  // Construct token pair identifier
  const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
  
  // Calculate minimum timestamp for recent prices
  const minTimestamp = new Date(Date.now() - (maxAgeSeconds * 1000)).toISOString();

  // Fetch recent prices from the database
  console.log(`Fetching prices for ${tokenPair} on chain ${baseToken.chainId}`);
  const { data: prices, error } = await supabase
    .from('dex_price_history')
    .select('*')
    .eq('token_pair', tokenPair)
    .eq('chain_id', baseToken.chainId)
    .gt('timestamp', minTimestamp)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Check if we have enough price data from different DEXes
  if (!prices || prices.length < 2) {
    console.log(`Not enough price data for ${tokenPair}. Found: ${prices?.length || 0}`);
    return [];
  }

  console.log(`Found ${prices.length} price entries for ${tokenPair}`);

  // Group latest prices by DEX
  const latestPricesByDex = new Map<string, PriceData>();
  prices.forEach(price => {
    if (!latestPricesByDex.has(price.dex_name)) {
      latestPricesByDex.set(price.dex_name, price);
    }
  });

  console.log(`Found ${latestPricesByDex.size} unique DEXes with pricing data`);

  const opportunities: ArbitrageOpportunity[] = [];
  
  // Find price differences between DEXes
  const priceDifferences = findPriceDifferences(latestPricesByDex);
  console.log(`Found ${priceDifferences.length} price differences to analyze`);

  // Calculate opportunities for profitable differences
  for (const [dex1, dex2, profitPercentage] of priceDifferences) {
    // Skip if profit percentage is below threshold
    if (profitPercentage < minProfitPercentage) {
      continue;
    }

    console.log(`Analyzing potential arbitrage between ${dex1} and ${dex2}: ${profitPercentage.toFixed(2)}%`);
    
    // Get buy/sell prices and DEXes
    const [buyDex, sellDex, buyPrice, sellPrice] = getBestPricePair(dex1, dex2, latestPricesByDex);
    
    // Calculate detailed profit and fee information
    const profitDetails = calculateArbitrageProfit(
      buyDex,
      sellDex,
      buyPrice,
      sellPrice,
      investmentAmount,
      baseToken.chainId,
      baseToken,
      quoteToken
    );

    // Get liquidity info
    const buyDexData = latestPricesByDex.get(buyDex)!;
    const sellDexData = latestPricesByDex.get(sellDex)!;
    const liquidity = Math.min(
      buyDexData.liquidity || Infinity,
      sellDexData.liquidity || Infinity
    ) || investmentAmount * 10; // Default liquidity estimate

    // Only include profitable opportunities after all fees
    if (profitDetails.netProfit > 0) {
      const opportunity: ArbitrageOpportunity = {
        id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
        tokenPair,
        token: baseToken.symbol,
        network: getNetworkName(baseToken.chainId),
        ...profitDetails,
        liquidity
      };
      
      opportunities.push(opportunity);
      console.log(`Found profitable opportunity: buy on ${buyDex}, sell on ${sellDex}, profit: ${profitDetails.netProfit.toFixed(2)} (${profitDetails.netProfitPercentage.toFixed(2)}%)`);
    }
  }

  return opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
}
