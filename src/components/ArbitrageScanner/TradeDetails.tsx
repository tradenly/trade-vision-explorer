
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TradeDetailsProps {
  opportunity: ArbitrageOpportunity;
  slippageTolerance?: number;
  tradeAmount: number;
  buyPriceImpact: number;
  sellPriceImpact?: number;
  estimatedTokenAmount: number;
  tradingFees?: number;
  gasFees?: number;
  platformFee?: number;
  maxTradeSize?: number;
}

const TradeDetails: React.FC<TradeDetailsProps> = ({
  opportunity,
  tradeAmount,
  buyPriceImpact,
  sellPriceImpact = 0,
  estimatedTokenAmount,
  tradingFees = opportunity.tradingFees,
  gasFees = opportunity.gasFee,
  platformFee = opportunity.platformFee,
  maxTradeSize = 0,
}) => {
  const isPriceImpactHigh = buyPriceImpact > 2 || sellPriceImpact > 2;
  const totalFees = tradingFees + gasFees + platformFee;
  
  // Calculate expected return with slippage
  const effectiveBuyPrice = opportunity.buyPrice * (1 + buyPriceImpact / 100);
  const effectiveSellPrice = opportunity.sellPrice * (1 - sellPriceImpact / 100);
  const expectedReturn = estimatedTokenAmount * effectiveSellPrice;
  
  // Calculate expected profit after all fees
  const grossProfit = expectedReturn - tradeAmount;
  const netProfit = grossProfit - totalFees;
  const netProfitPercentage = (netProfit / tradeAmount) * 100;

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
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium flex items-center">
                Price Impact (Buy):
                {buyPriceImpact > 1.5 && (
                  <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="bottom">
              <p className="text-xs">
                Price impact increases with trade size. Large trades can move market prices.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className={buyPriceImpact > 3 ? "text-red-500" : buyPriceImpact > 1.5 ? "text-amber-500" : ""}>
          {buyPriceImpact.toFixed(2)}%
        </span>
        
        {sellPriceImpact > 0 && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium flex items-center">
                    Price Impact (Sell):
                    {sellPriceImpact > 1.5 && (
                      <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="bottom">
                  <p className="text-xs">
                    Sell price impact shows how the sell transaction may affect market price.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className={sellPriceImpact > 3 ? "text-red-500" : sellPriceImpact > 1.5 ? "text-amber-500" : ""}>
              {sellPriceImpact.toFixed(2)}%
            </span>
          </>
        )}
        
        <span className="font-medium">Available Liquidity</span>
        <div className="text-muted-foreground">
          ${opportunity.liquidity?.toLocaleString() || 'Unknown'}
        </div>
        
        {maxTradeSize > 0 && (
          <>
            <span className="font-medium">Recommended Max Size</span>
            <div className="text-muted-foreground">
              ${maxTradeSize.toFixed(2)}
            </div>
          </>
        )}
      </div>

      <Separator />
      
      <div className="space-y-3 p-3 bg-muted/50 rounded-md">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Trade Amount</span>
          <span>${tradeAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Trading Fees</span>
          <span>-${tradingFees.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Gas Fee</span>
          <span>-${gasFees.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Platform Fee (0.5%)</span>
          <span>-${platformFee.toFixed(2)}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between items-center font-medium">
          <span>Expected Return</span>
          <span>${expectedReturn.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="border rounded-lg p-3">
        <div className="space-y-2">
          <div className="font-medium">Expected Profit</div>
          <div className="flex justify-between text-lg">
            <span className="text-green-600 font-bold">
              ${netProfit.toFixed(4)}
            </span>
            <span className="text-green-600 font-bold">
              ({netProfitPercentage.toFixed(2)}%)
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
