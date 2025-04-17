
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OpportunityListProps {
  opportunities: ArbitrageOpportunity[];
  onSelect: (opportunity: ArbitrageOpportunity) => void;
}

export const OpportunityList: React.FC<OpportunityListProps> = ({ opportunities, onSelect }) => {
  // If no opportunities, show a message
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No arbitrage opportunities found.</p>
          <p className="text-sm mt-2">Try scanning with different tokens or investment amount.</p>
        </CardContent>
      </Card>
    );
  }

  // Show the list of opportunities
  return (
    <div className="space-y-4">
      {opportunities.map((opportunity) => (
        <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-medium">{opportunity.tokenPair}</h3>
                <div className="flex items-center mt-1">
                  <span className="text-sm">Buy on <span className="font-medium">{opportunity.buyDex}</span></span>
                  <span className="mx-2">→</span>
                  <span className="text-sm">Sell on <span className="font-medium">{opportunity.sellDex}</span></span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  ${opportunity.estimatedProfit.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {opportunity.estimatedProfitPercentage.toFixed(2)}% profit
                </div>
              </div>
              
              <div className="flex justify-end items-center">
                <Button size="sm" onClick={() => onSelect(opportunity)}>
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OpportunityList;
