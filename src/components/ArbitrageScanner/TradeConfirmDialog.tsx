
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface TradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: ArbitrageOpportunity | null;
  onConfirm: () => void;
  executing: string | null;
  transactionStatus: 'pending' | 'success' | 'error' | null;
  investmentAmount: number;
}

const TradeConfirmDialog: React.FC<TradeConfirmDialogProps> = ({
  open,
  onOpenChange,
  opportunity,
  onConfirm,
  executing,
  transactionStatus,
  investmentAmount,
}) => {
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // 0.5% default
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<number>(investmentAmount);
  const { toast } = useToast();
  
  if (!opportunity) {
    return null;
  }
  
  // Calculate estimated token amount
  const tradeAmount = customAmount || investmentAmount;
  const tradingFee = opportunity.tradingFees / 100 * tradeAmount;
  const estimatedTokenAmount = (tradeAmount - tradingFee) / opportunity.buyPrice;
  
  // Calculate price impact based on liquidity (simplified model)
  const buyPriceImpact = opportunity.liquidityUSD 
    ? Math.min((tradeAmount / opportunity.liquidityUSD) * 100, 5) 
    : 0.1;
  
  const handleSlippageChange = (value: number[]) => {
    setSlippageTolerance(value[0]);
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCustomAmount(value);
    } else {
      setCustomAmount(0);
    }
  };
  
  // Show warning if price impact is high
  const isPriceImpactHigh = buyPriceImpact > 2;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !executing && onOpenChange(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Arbitrage Trade</DialogTitle>
          <DialogDescription>
            Review the details of this arbitrage opportunity before executing the trade.
          </DialogDescription>
        </DialogHeader>
        
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
            
            <span className="font-medium">Available Liquidity:</span>
            <span>${opportunity.liquidityUSD?.toLocaleString() || 'Unknown'}</span>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="customAmount" className="font-medium">Investment Amount</Label>
            <Input
              id="customAmount"
              type="number"
              value={customAmount || investmentAmount}
              onChange={handleCustomAmountChange}
              disabled={executing !== null}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Estimated Token Amount: {estimatedTokenAmount.toFixed(4)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="advanced-mode" className="font-medium">Advanced Mode</Label>
            <Switch
              id="advanced-mode"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
              disabled={executing !== null}
            />
          </div>
          
          {advancedMode && (
            <div className="space-y-4 border rounded-lg p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slippageTolerance" className="font-medium">Slippage Tolerance ({slippageTolerance}%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    id="slippageTolerance"
                    defaultValue={[slippageTolerance]}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    onValueChange={handleSlippageChange}
                    disabled={executing !== null}
                  />
                  <div className="w-12 text-right">{slippageTolerance}%</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-medium">Estimated Price Impact</Label>
                <div className={`flex items-center gap-2 ${isPriceImpactHigh ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {isPriceImpactHigh && <AlertTriangle className="h-4 w-4" />}
                  <span>{buyPriceImpact.toFixed(2)}%</span>
                </div>
                {isPriceImpactHigh && (
                  <p className="text-xs text-amber-500">Price impact is high. Consider reducing trade size.</p>
                )}
              </div>
            </div>
          )}
          
          <div className="border rounded-lg p-3">
            <div className="space-y-2">
              <Label className="font-medium">Expected Profit</Label>
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

          {transactionStatus === 'pending' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertTitle>Processing transaction</AlertTitle>
              <AlertDescription>Please wait while the trade is being executed...</AlertDescription>
            </Alert>
          )}

          {transactionStatus === 'success' && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>The trade has been successfully executed.</AlertDescription>
            </Alert>
          )}

          {transactionStatus === 'error' && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to execute the trade. Please try again.</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!executing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!!executing || (isPriceImpactHigh && advancedMode)}>
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Execute Trade"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TradeConfirmDialog;
