
import { PriceData } from './types.ts';

export function findPriceDifferences(
  pricesByDex: Map<string, PriceData>
): Array<[string, string, number]> {
  const priceEntries = Array.from(pricesByDex.entries());
  const differences: Array<[string, string, number]> = [];

  for (let i = 0; i < priceEntries.length; i++) {
    for (let j = i + 1; j < priceEntries.length; j++) {
      const [dex1, price1] = priceEntries[i];
      const [dex2, price2] = priceEntries[j];

      const priceDiff = Math.abs(price1.price - price2.price);
      const avgPrice = (price1.price + price2.price) / 2;
      const profitPercentage = (priceDiff / avgPrice) * 100;

      differences.push([dex1, dex2, profitPercentage]);
    }
  }

  return differences;
}

export function getBestPricePair(
  dex1: string,
  dex2: string,
  pricesByDex: Map<string, PriceData>
): [string, string, number, number] {
  const price1 = pricesByDex.get(dex1)!;
  const price2 = pricesByDex.get(dex2)!;
  
  return price1.price < price2.price
    ? [dex1, dex2, price1.price, price2.price]
    : [dex2, dex1, price2.price, price1.price];
}
