
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ArbitrageRequest, PriceData, ArbitrageOpportunity } from './types.ts';
import { 
  getNetworkName, 
  estimateGasFee, 
  calculateTradingFees, 
  calculatePlatformFee, 
  calculateRiskLevel 
} from './utils.ts';

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

  const latestPricesByDex = new Map<string, PriceData>();
  prices.forEach(price => {
    if (!latestPricesByDex.has(price.dex_name)) {
      latestPricesByDex.set(price.dex_name, price);
    }
  });

  const opportunities: ArbitrageOpportunity[] = [];
  const priceEntries = Array.from(latestPricesByDex.entries());

  for (let i = 0; i < priceEntries.length; i++) {
    for (let j = i + 1; j < priceEntries.length; j++) {
      const [dex1, price1] = priceEntries[i];
      const [dex2, price2] = priceEntries[j];

      const priceDiff = Math.abs(price1.price - price2.price);
      const avgPrice = (price1.price + price2.price) / 2;
      const profitPercentage = (priceDiff / avgPrice) * 100;

      if (profitPercentage >= minProfitPercentage) {
        const [buyDex, sellDex, buyPrice, sellPrice] = 
          price1.price < price2.price 
            ? [dex1, dex2, price1.price, price2.price]
            : [dex2, dex1, price2.price, price1.price];

        const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
        const platformFee = calculatePlatformFee(investmentAmount);
        const gasFee = estimateGasFee(baseToken.chainId);
        
        const buyGasFee = gasFee * 0.6;
        const sellGasFee = gasFee * 0.4;
        
        const estimatedProfit = investmentAmount * (sellPrice - buyPrice) / buyPrice;
        const netProfit = estimatedProfit - tradingFees - platformFee - buyGasFee - sellGasFee;
        const netProfitPercentage = (netProfit / investmentAmount) * 100;

        if (netProfit > 0) {
          opportunities.push({
            id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
            tokenPair,
            token: baseToken.symbol,
            network: getNetworkName(baseToken.chainId),
            buyDex,
            sellDex,
            buyPrice,
            sellPrice,
            priceDifferencePercentage: profitPercentage,
            liquidity: Math.min(price1.liquidity || 0, price2.liquidity || 0),
            estimatedProfit,
            estimatedProfitPercentage: profitPercentage,
            gasFee,
            netProfit,
            netProfitPercentage,
            baseToken,
            quoteToken,
            timestamp: Date.now(),
            buyGasFee,
            sellGasFee,
            tradingFees,
            platformFee,
            investmentAmount
          });
        }
      }
    }
  }

  return opportunities;
}
