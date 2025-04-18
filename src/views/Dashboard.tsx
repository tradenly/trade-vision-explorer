
import React, { useState } from 'react';
import WalletSection from '@/components/WalletConnect/WalletSection';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import WelcomeSection from '@/components/Dashboard/WelcomeSection';
import ArbitrageOpportunities from '@/components/Dashboard/ArbitrageOpportunities';
import PriceMonitoringSection from '@/components/Dashboard/PriceMonitoringSection';
import { useArbitrageOpportunities } from '@/hooks/useArbitrageOpportunities';
import { ArbitrageOpportunity as DexServiceArbitrageOpportunity } from '@/services/dexService';
import { TokenInfo } from '@/services/tokenListService';

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
  const mappedOpportunities: DexServiceArbitrageOpportunity[] = opportunities.map(opportunity => {
    // Create dummy baseToken and quoteToken objects for the interface requirement
    const baseToken: TokenInfo = {
      name: opportunity.token_pair?.split('/')[0] || 'Unknown',
      symbol: opportunity.token_pair?.split('/')[0] || 'UNK',
      address: '0x',
      chainId: opportunity.network === 'ethereum' ? 1 : opportunity.network === 'bnb' ? 56 : opportunity.network === 'solana' ? 101 : 1,
      decimals: 18
    };
    
    const quoteToken: TokenInfo = {
      name: opportunity.token_pair?.split('/')[1] || 'USD',
      symbol: opportunity.token_pair?.split('/')[1] || 'USD',
      address: '0x',
      chainId: baseToken.chainId,
      decimals: 18
    };

    // Calculate estimated profit percentage
    const estimatedProfitPercentage = opportunity.net_profit_percentage || 0;
    
    // Get the buy and sell prices
    const buyPrice = parseFloat(opportunity.buy_price?.toString() || '0');
    const sellPrice = parseFloat(opportunity.sell_price?.toString() || '0');

    return {
      ...opportunity,
      // Add required properties from ArbitrageOpportunity interface
      tradingFees: opportunity.trading_fees || 0,
      platformFee: opportunity.platform_fee || 0,
      gasFee: opportunity.gas_fee || 0,
      buyDex: opportunity.buy_exchange,
      sellDex: opportunity.sell_exchange,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      tokenPair: opportunity.token_pair,
      priceDifferencePercentage: opportunity.price_diff,
      estimatedProfit: parseFloat(opportunity.estimated_profit || '0'),
      netProfitPercentage: opportunity.net_profit_percentage || 0,
      // Add the missing properties
      estimatedProfitPercentage: estimatedProfitPercentage,
      baseToken: baseToken,
      quoteToken: quoteToken,
      timestamp: Date.now(),
      buyGasFee: (opportunity.gas_fee || 0) / 2,
      sellGasFee: (opportunity.gas_fee || 0) / 2,
      netProfit: opportunity.net_profit || 0,
      token: baseToken.symbol,
      liquidity: opportunity.liquidity_buy || opportunity.liquidity_sell || 100000,
      investmentAmount: investmentAmount,
      // Add the new required properties
      buyPriceImpact: 0,
      sellPriceImpact: 0,
      adjustedBuyPrice: buyPrice,
      adjustedSellPrice: sellPrice
    };
  });

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
