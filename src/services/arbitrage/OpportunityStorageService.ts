
import { supabase } from '@/lib/supabaseClient';
import { ArbitrageOpportunity } from '@/services/dexService';
import { calculateRiskLevel } from './utils';

export async function storeArbitrageOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
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
