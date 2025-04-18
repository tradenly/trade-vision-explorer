
import React, { useState } from 'react';
import WalletSection from '@/components/WalletConnect/WalletSection';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import WelcomeSection from '@/components/Dashboard/WelcomeSection';
import ArbitrageOpportunities from '@/components/Dashboard/ArbitrageOpportunities';
import PriceMonitoringSection from '@/components/Dashboard/PriceMonitoringSection';
import { useArbitrageOpportunities } from '@/hooks/useArbitrageOpportunities';

const Dashboard: React.FC = () => {
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const { opportunities, loading, error, refetch } = useArbitrageOpportunities(investmentAmount);

  const handleRefresh = () => {
    refetch();
  };

  const handleInvestmentAmountChange = (amount: number) => {
    setInvestmentAmount(amount);
  };

  return (
    <div className="container mx-auto py-8">
      <DashboardHeader />
      <WalletSection />
      <WelcomeSection />
      
      <ArbitrageOpportunities
        opportunities={opportunities}
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
