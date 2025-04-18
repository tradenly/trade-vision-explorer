
import { PriceData } from './types.ts';

/**
 * Find price differences between DEXes
 * @returns Array of [dex1, dex2, profitPercentage] tuples
 */
export function findPriceDifferences(
  pricesByDex: Map<string, PriceData>
): [string, string, number][] {
  const results: [string, string, number][] = [];
  const dexes = Array.from(pricesByDex.keys());
  
  // Compare each pair of DEXes
  for (let i = 0; i < dexes.length; i++) {
    for (let j = i + 1; j < dexes.length; j++) {
      const dex1 = dexes[i];
      const dex2 = dexes[j];
      const price1 = pricesByDex.get(dex1)!.price;
      const price2 = pricesByDex.get(dex2)!.price;
      
      // Calculate price difference percentage
      const priceDiff = Math.abs(price1 - price2);
      const minPrice = Math.min(price1, price2);
      const profitPercentage = (priceDiff / minPrice) * 100;
      
      results.push([dex1, dex2, profitPercentage]);
    }
  }
  
  // Sort by profit percentage (highest to lowest)
  return results.sort((a, b) => b[2] - a[2]);
}

/**
 * Determine which DEX should be used for buying and which for selling
 * @returns [buyDex, sellDex, buyPrice, sellPrice]
 */
export function getBestPricePair(
  dex1: string,
  dex2: string,
  pricesByDex: Map<string, PriceData>
): [string, string, number, number] {
  const price1 = pricesByDex.get(dex1)!.price;
  const price2 = pricesByDex.get(dex2)!.price;
  
  // For arbitrage, we want to buy at the lower price and sell at the higher price
  if (price1 < price2) {
    return [dex1, dex2, price1, price2];
  } else {
    return [dex2, dex1, price2, price1];
  }
}
