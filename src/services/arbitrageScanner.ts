
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import DexRegistry from './dex/DexRegistry';
import { PriceQuote } from './dex/types';
import { PriceAggregationService } from './dex/services/PriceAggregationService';

interface ScanResult {
  opportunities: ArbitrageOpportunity[];
  errors: string[];
}

export async function scanArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
): Promise<ScanResult> {
  const errors: string[] = [];
  const opportunities: ArbitrageOpportunity[] = [];

  try {
    // Get DEX registry instance
    const dexRegistry = DexRegistry.getInstance();
    const adapters = dexRegistry.getAdaptersForChain(baseToken.chainId);

    if (adapters.length < 2) {
      return { 
        opportunities: [], 
        errors: ['Not enough DEXes available for arbitrage'] 
      };
    }

    // Use the new price aggregation service
    const priceAggregationService = PriceAggregationService.getInstance();
    const priceQuotes = await priceAggregationService.aggregatePrices(baseToken, quoteToken);
    
    if (Object.keys(priceQuotes).length < 2) {
      return {
        opportunities: [],
        errors: ['Not enough price quotes available for arbitrage']
      };
    }

    // Compare prices between DEXes to find arbitrage opportunities
    const dexNames = Object.keys(priceQuotes);
    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const dex1 = dexNames[i];
        const dex2 = dexNames[j];
        const quote1 = priceQuotes[dex1];
        const quote2 = priceQuotes[dex2];

        if (!quote1 || !quote2) continue;

        const priceDiff = Math.abs(quote1.price - quote2.price);
        const avgPrice = (quote1.price + quote2.price) / 2;
        const profitPercentage = (priceDiff / avgPrice) * 100;

        // Check if profit meets minimum threshold
        if (profitPercentage >= minProfitPercentage) {
          const [buyDex, sellDex, buyPrice, sellPrice] = 
            quote1.price < quote2.price 
              ? [dex1, dex2, quote1.price, quote2.price]
              : [dex2, dex1, quote2.price, quote1.price];

          // Calculate fees and potential profit
          const buyFee = (quote1.fees || 0.003) * investmentAmount;
          const sellFee = (quote2.fees || 0.003) * investmentAmount;
          const gasFee = (quote1.gasEstimate || 0) + (quote2.gasEstimate || 0);
          const estimatedProfit = (sellPrice - buyPrice) * investmentAmount / buyPrice;
          const netProfit = estimatedProfit - buyFee - sellFee - gasFee;

          // Add platform fee (0.5% of investment)
          const platformFee = investmentAmount * 0.005;
          const finalNetProfit = netProfit - platformFee;

          if (finalNetProfit > 0) {
            opportunities.push({
              id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
              tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
              token: baseToken.symbol,
              network: getNetworkName(baseToken.chainId),
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              priceDifferencePercentage: profitPercentage,
              liquidity: Math.min(quote1.liquidityUSD || 0, quote2.liquidityUSD || 0),
              estimatedProfit,
              estimatedProfitPercentage: profitPercentage,
              gasFee,
              netProfit: finalNetProfit,
              netProfitPercentage: (finalNetProfit / investmentAmount) * 100,
              baseToken,
              quoteToken,
              timestamp: Date.now(),
              buyGasFee: quote1.gasEstimate || 0,
              sellGasFee: quote2.gasEstimate || 0,
              tradingFees: buyFee + sellFee,
              platformFee,
              investmentAmount
            });
          }
        }
      }
    }

    // Store opportunities in the database for analysis
    if (opportunities.length > 0) {
      await storeArbitrageOpportunities(opportunities);
    }

    return { opportunities, errors };
  } catch (error) {
    console.error('Error in scanArbitrageOpportunities:', error);
    return {
      opportunities: [],
      errors: ['Failed to scan for arbitrage opportunities']
    };
  }
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

async function storeArbitrageOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('arbitrage_opportunities')
      .insert(opportunities.map(opp => ({
        network: opp.network,
        token_pair: opp.tokenPair,
        buy_exchange: opp.buyDex,
        sell_exchange: opp.sellDex,
        price_diff: opp.priceDifferencePercentage,
        estimated_profit: opp.netProfit.toFixed(2),
        risk: calculateRiskLevel(opp.netProfitPercentage),
        status: 'active'
      })));

    if (error) {
      console.error('Error storing arbitrage opportunities:', error);
    }
  } catch (error) {
    console.error('Error in storeArbitrageOpportunities:', error);
  }
}

function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
