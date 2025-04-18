
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ArbitrageRequest, PriceData, ArbitrageOpportunity } from './types.ts';
import { getNetworkName } from './utils.ts';
import { findPriceDifferences, getBestPricePair } from './price-comparison.ts';
import { calculateArbitrageProfit } from './profit-calculator.ts';

export async function scanArbitrageOpportunities(
  supabase: ReturnType<typeof createClient>,
  request: ArbitrageRequest
): Promise<ArbitrageOpportunity[]> {
  const { baseToken, quoteToken, minProfitPercentage = 0.5, investmentAmount = 1000, maxAgeSeconds = 30 } = request;

  const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
  const minTimestamp = new Date(Date.now() - (maxAgeSeconds * 1000)).toISOString();

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

  if (!prices || prices.length < 2) {
    return [];
  }

  // Group latest prices by DEX
  const latestPricesByDex = new Map<string, PriceData>();
  prices.forEach(price => {
    if (!latestPricesByDex.has(price.dex_name)) {
      latestPricesByDex.set(price.dex_name, price);
    }
  });

  const opportunities: ArbitrageOpportunity[] = [];
  
  // Find price differences between DEXes
  const priceDifferences = findPriceDifferences(latestPricesByDex);

  // Calculate opportunities for profitable differences
  for (const [dex1, dex2, profitPercentage] of priceDifferences) {
    if (profitPercentage >= minProfitPercentage) {
      const [buyDex, sellDex, buyPrice, sellPrice] = getBestPricePair(dex1, dex2, latestPricesByDex);
      
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

      if (profitDetails.netProfit > 0) {
        opportunities.push({
          id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
          tokenPair,
          token: baseToken.symbol,
          network: getNetworkName(baseToken.chainId),
          ...profitDetails
        });
      }
    }
  }

  return opportunities;
}
