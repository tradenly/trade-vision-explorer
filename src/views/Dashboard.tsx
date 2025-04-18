
import React, { useState } from 'react';
import WalletSection from '@/components/WalletConnect/WalletSection';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import WelcomeSection from '@/components/Dashboard/WelcomeSection';
import ArbitrageOpportunities from '@/components/Dashboard/ArbitrageOpportunities';
import PriceMonitoringSection from '@/components/Dashboard/PriceMonitoringSection';
import { useArbitrageOpportunities } from '@/hooks/useArbitrageOpportunities';
import { ArbitrageOpportunity as DexServiceArbitrageOpportunity } from '@/services/dexService';

const Dashboard: React.FC = () => {
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const { opportunities, loading, error, refetch } = useArbitrageOpportunities(investmentAmount);

  const handleRefresh = () => {
    refetch();
  };

  const handleInvestmentAmountChange = (amount: number) => {
    setInvestmentAmount(amount);
  };

  // Convert opportunities to the format expected by the ArbitrageOpportunities component
  const mappedOpportunities: DexServiceArbitrageOpportunity[] = opportunities.map(opportunity => ({
    ...opportunity,
    // Add required properties from ArbitrageOpportunity interface
    tradingFees: opportunity.trading_fees || 0,
    platformFee: opportunity.platform_fee || 0,
    gasFee: opportunity.gas_fee || 0,
    buyDex: opportunity.buy_exchange,
    sellDex: opportunity.sell_exchange,
    buyPrice: parseFloat(opportunity.buy_price?.toString() || '0'),
    sellPrice: parseFloat(opportunity.sell_price?.toString() || '0'),
    tokenPair: opportunity.token_pair,
    priceDifferencePercentage: opportunity.price_diff,
    estimatedProfit: parseFloat(opportunity.estimated_profit || '0'),
    netProfitPercentage: opportunity.net_profit_percentage || 0,
  }));

  return (
    <div className="container mx-auto py-8">
      <DashboardHeader />
      <WalletSection />
      <WelcomeSection />
      
      <ArbitrageOpportunities
        opportunities={mappedOpportunities}
        loading={loading}
        error={error}
        investmentAmount={investmentAmount}
        onRefresh={handleRefresh}
        onInvestmentAmountChange={handleInvestmentAmountChange}
      />
      
      <PriceMonitoringSection />
    </div>
  );
};

export default Dashboard;
