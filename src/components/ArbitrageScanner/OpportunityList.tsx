
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';

interface OpportunityListProps {
  opportunities: ArbitrageOpportunity[];
  onSelect: (opportunity: ArbitrageOpportunity) => void;
}

const OpportunityList: React.FC<OpportunityListProps> = ({ opportunities, onSelect }) => {
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No arbitrage opportunities found. Try scanning with different tokens or adjusting the parameters.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {opportunities.map((opportunity) => (
        <Card key={opportunity.id} className="hover:bg-accent/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{opportunity.tokenPair}</span>
                  <span className="bg-muted px-2 py-1 rounded text-xs">
                    {opportunity.network}
                  </span>
                </div>
                <div className="flex items-center mt-2 text-sm">
                  <span>Buy on <strong>{opportunity.buyDex}</strong> @ ${opportunity.buyPrice.toFixed(4)}</span>
                  <ArrowRightLeft className="mx-2 h-4 w-4" />
                  <span>Sell on <strong>{opportunity.sellDex}</strong> @ ${opportunity.sellPrice.toFixed(4)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-600 dark:text-green-400 font-bold">
                  +${opportunity.estimatedProfit.toFixed(2)} ({opportunity.estimatedProfitPercentage.toFixed(2)}%)
                </div>
                <Button 
                  size="sm" 
                  onClick={() => onSelect(opportunity)}
                  className="mt-2"
                >
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
