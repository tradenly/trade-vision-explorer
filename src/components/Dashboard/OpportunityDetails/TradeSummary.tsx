
import React from 'react';
import { formatNumber, formatTokenPrice } from '@/lib/utils';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';

interface TradeSummaryProps {
  opportunity: ArbitrageOpportunity;
  investmentAmount: number;
}

const TradeSummary: React.FC<TradeSummaryProps> = ({ opportunity, investmentAmount }) => {
  return (
    <div className="grid grid-cols-2 gap-4 py-2">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Token Pair</p>
        <p className="font-medium">{opportunity.tokenPair}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Network</p>
        <p className="font-medium">{opportunity.network}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Buy on</p>
        <p className="font-medium">{opportunity.buyDex} @ ${formatTokenPrice(opportunity.buyPrice)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Sell on</p>
        <p className="font-medium">{opportunity.sellDex} @ ${formatTokenPrice(opportunity.sellPrice)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Investment</p>
        <p className="font-medium">${formatNumber(investmentAmount)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Price Difference</p>
        <p className="font-medium text-green-600">+{opportunity.priceDifferencePercentage.toFixed(2)}%</p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
        <p className="font-medium text-amber-600">
          ${formatNumber(opportunity.tradingFees + opportunity.platformFee + opportunity.gasFee)}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Estimated Profit</p>
        <p className="font-medium text-green-600">
          ${formatNumber(opportunity.netProfit)} ({opportunity.netProfitPercentage.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
};

export default TradeSummary;
