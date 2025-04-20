
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArbitrageOpportunity } from '@/services/dexService';
import { OpportunityList } from './OpportunityList';

interface OpportunityTabsProps {
  opportunities: ArbitrageOpportunity[];
  onSelect: (opportunity: ArbitrageOpportunity) => void;
}

export const OpportunityTabs: React.FC<OpportunityTabsProps> = ({ opportunities, onSelect }) => {
  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="low-risk">Low Risk</TabsTrigger>
        <TabsTrigger value="medium-risk">Medium Risk</TabsTrigger>
        <TabsTrigger value="high-risk">High Risk</TabsTrigger>
      </TabsList>
      
      <TabsContent value="all">
        <OpportunityList 
          opportunities={opportunities} 
          onSelect={onSelect} 
        />
      </TabsContent>
      
      <TabsContent value="low-risk">
        <OpportunityList 
          opportunities={opportunities.filter(opp => opp.estimatedProfitPercentage >= 2)} 
          onSelect={onSelect} 
        />
      </TabsContent>
      
      <TabsContent value="medium-risk">
        <OpportunityList 
          opportunities={opportunities.filter(opp => 
            opp.estimatedProfitPercentage >= 1 && opp.estimatedProfitPercentage < 2
          )} 
          onSelect={onSelect} 
        />
      </TabsContent>
      
      <TabsContent value="high-risk">
        <OpportunityList 
          opportunities={opportunities.filter(opp => opp.estimatedProfitPercentage < 1)} 
          onSelect={onSelect} 
        />
      </TabsContent>
    </Tabs>
  );
};
