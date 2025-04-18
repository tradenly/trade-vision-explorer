
import { useState, useEffect, useCallback } from 'react';
import { fetchArbitrageOpportunities } from '@/services/supabaseService';
import { toast } from '@/hooks/use-toast';

interface ArbitrageOpportunity {
  id: string;
  token_pair: string;
  buy_exchange: string;
  sell_exchange: string;
  price_diff: number;
  estimated_profit: string;
  network: string;
  status: string;
  buy_price?: number;
  sell_price?: number;
  trading_fees?: number;
  platform_fee?: number;
  gas_fee?: number;
  net_profit?: number;
  net_profit_percentage?: number;
  liquidity_buy?: number;
  liquidity_sell?: number;
}

interface UseArbitrageOpportunitiesReturn {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useArbitrageOpportunities = (investmentAmount: number): UseArbitrageOpportunitiesReturn => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const enhanceOpportunityData = (opportunity: any): ArbitrageOpportunity => {
    // Use real data if available, otherwise generate reasonable mock data
    const buyPrice = opportunity.buy_price || parseFloat((Math.random() * 1000 + 1000).toFixed(2));
    const sellPrice = opportunity.sell_price || parseFloat((Math.random() * 1000 + 1050).toFixed(2));
    const tradingFees = opportunity.trading_fees || parseFloat((Math.random() * 5 + 1).toFixed(2));
    const platformFee = opportunity.platform_fee || 0.5;
    const gasFee = opportunity.gas_fee || parseFloat((Math.random() * 10 + 5).toFixed(2));
    const netProfit = opportunity.net_profit || 
      parseFloat((investmentAmount * (sellPrice / buyPrice - 1) - tradingFees - platformFee - gasFee).toFixed(2));
    const netProfitPercentage = opportunity.net_profit_percentage || 
      parseFloat(((netProfit / investmentAmount) * 100).toFixed(2));

    return {
      ...opportunity,
      buy_price: buyPrice,
      sell_price: sellPrice,
      trading_fees: tradingFees,
      platform_fee: platformFee,
      gas_fee: gasFee,
      net_profit: netProfit,
      net_profit_percentage: netProfitPercentage,
      liquidity_buy: opportunity.liquidity_buy || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
      liquidity_sell: opportunity.liquidity_sell || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
      tokenPair: opportunity.token_pair,
      buyDex: opportunity.buy_exchange,
      sellDex: opportunity.sell_exchange,
      priceDifferencePercentage: opportunity.price_diff,
      estimatedProfit: parseFloat(opportunity.estimated_profit),
      netProfitPercentage: netProfitPercentage
    };
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchArbitrageOpportunities();
      const enhancedData = data.map(enhanceOpportunityData);
      
      // Sort opportunities by profit percentage
      const sortedData = enhancedData.sort((a, b) => 
        (b.net_profit_percentage || 0) - (a.net_profit_percentage || 0)
      );
      
      setOpportunities(sortedData);
      setError(null);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
      setError('Failed to load data from Supabase');
      toast({
        title: "Error loading opportunities",
        description: "Failed to load arbitrage data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [investmentAmount]);

  useEffect(() => {
    fetchData();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchData();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchData
  };
};
