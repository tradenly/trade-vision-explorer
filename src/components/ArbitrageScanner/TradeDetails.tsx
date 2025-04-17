
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';

interface TradeDetailsProps {
  opportunity: ArbitrageOpportunity;
  slippageTolerance?: number;
  tradeAmount: number;
  buyPriceImpact: number;
  estimatedTokenAmount: number;
}

const TradeDetails: React.FC<TradeDetailsProps> = ({
  opportunity,
  tradeAmount,
  buyPriceImpact,
  estimatedTokenAmount,
}) => {
  const isPriceImpactHigh = buyPriceImpact > 2;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 py-2">
        <span className="font-medium">Token Pair:</span>
        <span>{opportunity.tokenPair}</span>
        
        <span className="font-medium">Buy On:</span>
        <span>{opportunity.buyDex} (${opportunity.buyPrice.toFixed(4)})</span>
        
        <span className="font-medium">Sell On:</span>
        <span>{opportunity.sellDex} (${opportunity.sellPrice.toFixed(4)})</span>
        
        <span className="font-medium">Network:</span>
        <span className="capitalize">{opportunity.network}</span>
        
        <span className="font-medium">Gas Fee:</span>
        <span>${opportunity.gasFee.toFixed(4)}</span>
        
        <span className="font-medium">Trading Fees:</span>
        <span>${opportunity.tradingFees.toFixed(4)}</span>
        
        <span className="font-medium">Platform Fee (0.5%):</span>
        <span>${opportunity.platformFee.toFixed(4)}</span>
        
        <span className="font-medium">Available Liquidity</span>
        <div className="text-muted-foreground">
          ${opportunity.liquidity?.toLocaleString() || 'Unknown'}
        </div>
      </div>

      <Separator />
      
      <div className="border rounded-lg p-3">
        <div className="space-y-2">
          <div className="font-medium">Expected Profit</div>
          <div className="flex justify-between text-lg">
            <span className="text-green-600 font-bold">
              ${opportunity.estimatedProfit.toFixed(4)}
            </span>
            <span className="text-green-600 font-bold">
              ({opportunity.estimatedProfitPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Estimated Token Amount: {estimatedTokenAmount.toFixed(4)}</span>
      </div>

      {isPriceImpactHigh && (
        <p className="text-xs text-amber-500">Price impact is high. Consider reducing trade size.</p>
      )}
    </div>
  );
};

export default TradeDetails;
