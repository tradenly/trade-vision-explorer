
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from './tokenListService';
import { ArbitrageOpportunity } from './dexService';

interface PriceData {
  dex_name: string;
  price: number;
  timestamp: string;
  chain_id: number;
}

export async function findArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  maxAgeSeconds: number = 30
): Promise<ArbitrageOpportunity[]> {
  const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
  const minTimestamp = new Date(Date.now() - (maxAgeSeconds * 1000)).toISOString();

  // Get recent prices across all DEXes
  const { data: prices, error } = await supabase
    .from('dex_price_history')
    .select('*')
    .eq('token_pair', tokenPair)
    .eq('chain_id', baseToken.chainId)
    .gt('timestamp', minTimestamp)
    .order('timestamp', { ascending: false });

  if (error || !prices) {
    console.error('Error fetching price history:', error);
    return [];
  }

  // Group prices by DEX (using most recent price for each)
  const latestPricesByDex = new Map<string, PriceData>();
  prices.forEach(price => {
    if (!latestPricesByDex.has(price.dex_name)) {
      latestPricesByDex.set(price.dex_name, price);
    }
  });

  const opportunities: ArbitrageOpportunity[] = [];
  const priceEntries = Array.from(latestPricesByDex.entries());

  // Compare prices between DEXes
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

        const opportunity: ArbitrageOpportunity = {
          id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
          tokenPair,
          token: baseToken.symbol,
          network: getNetworkName(baseToken.chainId),
          buyDex,
          sellDex,
          buyPrice,
          sellPrice,
          priceDifferencePercentage: profitPercentage,
          liquidity: 0, // Will be updated with real data later
          estimatedProfit: priceDiff,
          estimatedProfitPercentage: profitPercentage,
          gasFee: estimateGasFee(baseToken.chainId),
          netProfit: 0, // Will be calculated after fees
          netProfitPercentage: 0,
          baseToken,
          quoteToken,
          timestamp: Date.now(),
          buyGasFee: 0,
          sellGasFee: 0,
          tradingFees: 0,
          platformFee: 0,
          investmentAmount: 0
        };

        opportunities.push(opportunity);
      }
    }
  }

  // Store opportunities in the database
  if (opportunities.length > 0) {
    await supabase
      .from('arbitrage_opportunities')
      .insert(opportunities.map(opp => ({
        network: opp.network,
        token_pair: opp.tokenPair,
        buy_exchange: opp.buyDex,
        sell_exchange: opp.sellDex,
        price_diff: opp.priceDifferencePercentage,
        estimated_profit: opp.estimatedProfit.toFixed(2),
        risk: calculateRiskLevel(opp.estimatedProfitPercentage),
        status: 'active'
      })));
  }

  return opportunities;
}

function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    56: 'bnb',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    101: 'solana'
  };
  return networks[chainId] || 'unknown';
}

function estimateGasFee(chainId: number): number {
  const gasFees: Record<number, number> = {
    1: 0.005, // ETH gas estimate
    56: 0.0005, // BSC gas estimate
    137: 0.001, // Polygon gas estimate
    42161: 0.002, // Arbitrum gas estimate
    10: 0.001, // Optimism gas estimate
    8453: 0.001, // Base gas estimate
    101: 0.00001 // Solana gas estimate
  };
  return gasFees[chainId] || 0.003;
}

function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
