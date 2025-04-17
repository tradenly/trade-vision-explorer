
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  CircleDollarSign, 
  ArrowDownUp, 
  Percent, 
  Scale, 
  Fuel, 
  DollarSign 
} from 'lucide-react';

interface ArbitrageDetailsProps {
  opportunity: ArbitrageOpportunity;
  investmentAmount: number;
}

const ArbitrageDetails: React.FC<ArbitrageDetailsProps> = ({ 
  opportunity,
  investmentAmount 
}) => {
  const formattedProfit = opportunity.estimatedProfit.toFixed(2);
  const formattedPercent = opportunity.estimatedProfitPercentage.toFixed(2);
  const tokenAmount = investmentAmount / opportunity.buyPrice;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          Arbitrage Opportunity: {opportunity.tokenPair}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buy Details */}
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Buy Details
            </h3>
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange:</span>
                <span className="font-medium">{opportunity.buyDex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buy Price:</span>
                <span className="font-medium">${opportunity.buyPrice.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount In USD:</span>
                <span className="font-medium">${investmentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Amount:</span>
                <span className="font-medium">{tokenAmount.toFixed(6)} {opportunity.token}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Fee:</span>
                <span className="font-medium">${(opportunity.tradingFees / 2).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Sell Details */}
          <div className="space-y-2">
            <h3 className="font-medium flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              Sell Details
            </h3>
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange:</span>
                <span className="font-medium">{opportunity.sellDex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sell Price:</span>
                <span className="font-medium">${opportunity.sellPrice.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Out:</span>
                <span className="font-medium">${(tokenAmount * opportunity.sellPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price Difference:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  ${(opportunity.sellPrice - opportunity.buyPrice).toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Fee:</span>
                <span className="font-medium">${(opportunity.tradingFees / 2).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Fee Breakdown */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Fee Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded-md flex flex-col items-center justify-center">
              <span className="text-muted-foreground text-sm">Trading Fees</span>
              <span className="font-medium text-lg">${opportunity.tradingFees.toFixed(2)}</span>
            </div>
            <div className="p-3 border rounded-md flex flex-col items-center justify-center">
              <span className="text-muted-foreground text-sm">Gas Fees</span>
              <span className="font-medium text-lg">${opportunity.gasFee.toFixed(2)}</span>
            </div>
            <div className="p-3 border rounded-md flex flex-col items-center justify-center">
              <span className="text-muted-foreground text-sm">Platform Fee (0.5%)</span>
              <span className="font-medium text-lg">${opportunity.platformFee.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Profit Calculation */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
          <h3 className="font-medium flex items-center gap-2 mb-4">
            <Percent className="h-4 w-4" />
            Profit Calculation
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Sale Amount:</span>
              <span className="font-medium">${(tokenAmount * opportunity.sellPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Investment:</span>
              <span className="font-medium">-${investmentAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Fees:</span>
              <span className="font-medium">-${(opportunity.tradingFees + opportunity.gasFee + opportunity.platformFee).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Net Profit:</span>
              <span className="text-green-600 dark:text-green-400">${formattedProfit}</span>
            </div>
            <div className="flex justify-between">
              <span>Return on Investment:</span>
              <span className="text-green-600 dark:text-green-400">{formattedPercent}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArbitrageDetails;
