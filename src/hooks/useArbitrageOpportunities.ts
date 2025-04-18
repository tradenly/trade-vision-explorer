
import { useState, useEffect } from 'react';
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

  const enhanceOpportunityData = (opportunity: any): ArbitrageOpportunity => ({
    ...opportunity,
    buy_price: opportunity.buy_price || parseFloat((Math.random() * 1000 + 1000).toFixed(2)),
    sell_price: opportunity.sell_price || parseFloat((Math.random() * 1000 + 1050).toFixed(2)),
    trading_fees: opportunity.trading_fees || parseFloat((Math.random() * 5 + 1).toFixed(2)),
    platform_fee: opportunity.platform_fee || 0.5,
    gas_fee: opportunity.gas_fee || parseFloat((Math.random() * 10 + 5).toFixed(2)),
    net_profit: opportunity.net_profit || parseFloat((Math.random() * 20 + 10).toFixed(2)),
    liquidity_buy: opportunity.liquidity_buy || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
    liquidity_sell: opportunity.liquidity_sell || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchArbitrageOpportunities();
      const enhancedData = data.map(enhanceOpportunityData);
      setOpportunities(enhancedData);
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    opportunities,
    loading,
    error,
    refetch: fetchData
  };
};
