
import { formatNumber } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TradeDetailsProps } from './types';

const TradeDetails: React.FC<TradeDetailsProps> = ({
  opportunity,
  tradeAmount,
  buyPriceImpact,
  sellPriceImpact,
  estimatedTokenAmount,
  tradingFees,
  gasFees,
  platformFee,
  maxTradeSize
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Buy on {opportunity.buyDex}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span>${formatNumber(opportunity.buyPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Impact:</span>
              <span className={buyPriceImpact > 2 ? 'text-red-500' : 'text-green-500'}>
                {buyPriceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pool Liquidity:</span>
              <span>${formatNumber(opportunity.liquidity)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Sell on {opportunity.sellDex}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span>${formatNumber(opportunity.sellPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Impact:</span>
              <span className={sellPriceImpact > 2 ? 'text-red-500' : 'text-green-500'}>
                {sellPriceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pool Liquidity:</span>
              <span>${formatNumber(opportunity.liquidity)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Transaction Details</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investment Amount:</span>
            <span>${formatNumber(tradeAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated {opportunity.token} Amount:</span>
            <span>{formatNumber(estimatedTokenAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trading Fees:</span>
            <span className="text-yellow-500">${formatNumber(tradingFees)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gas Fees:</span>
            <span className="text-yellow-500">${formatNumber(gasFees)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform Fee (0.5%):</span>
            <span className="text-yellow-500">${formatNumber(platformFee)}</span>
          </div>
          <div className="flex justify-between font-medium mt-2">
            <span>Net Profit:</span>
            <span className="text-green-500">${formatNumber(opportunity.netProfit)}</span>
          </div>
        </div>
      </div>

      {maxTradeSize && maxTradeSize < tradeAmount && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: Your trade size (${formatNumber(tradeAmount)}) exceeds the recommended maximum of ${formatNumber(maxTradeSize)} based on current liquidity.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TradeDetails;
