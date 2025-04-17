import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

type TransactionStatus = 'pending' | 'success' | 'error' | null;

interface TradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: ArbitrageOpportunity | null;
  onConfirm: () => void;
  executing: string | null;
  transactionStatus: TransactionStatus;
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
  const [executionProgress, setExecutionProgress] = useState<number>(0);
  const [executionStep, setExecutionStep] = useState<string>('');
  const { toast } = useToast();
  
  useEffect(() => {
    if (!open || !executing) {
      setExecutionProgress(0);
      setExecutionStep('');
      return;
    }
    
    if (executing && transactionStatus === 'pending') {
      const steps = [
        { progress: 15, message: 'Connecting to wallet...' },
        { progress: 30, message: 'Checking token allowance...' },
        { progress: 45, message: 'Preparing transaction...' },
        { progress: 60, message: `Sending to ${opportunity?.buyDex}...` },
        { progress: 75, message: 'Transaction submitted...' },
        { progress: 90, message: 'Confirming transaction...' }
      ];
      
      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < steps.length && transactionStatus === 'pending') {
          setExecutionProgress(steps[currentStep].progress);
          setExecutionStep(steps[currentStep].message);
          currentStep++;
        } else {
          clearInterval(progressInterval);
          if (transactionStatus === 'success') {
            setExecutionProgress(100);
            setExecutionStep('Transaction complete!');
          }
        }
      }, 800);
      
      return () => clearInterval(progressInterval);
    }
  }, [executing, open, transactionStatus, opportunity]);
  
  if (!opportunity) {
    return null;
  }
  
  const tradeAmount = customAmount || investmentAmount;
  const tradingFee = opportunity.tradingFees / 100 * tradeAmount;
  const estimatedTokenAmount = (tradeAmount - tradingFee) / opportunity.buyPrice;
  
  const buyPriceImpact = opportunity.liquidity 
    ? Math.min((tradeAmount / opportunity.liquidity) * 100, 5) 
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
  
  const isPriceImpactHigh = buyPriceImpact > 2;
  
  return (
    <Dialog open={open} onOpenChange={(open) => !executing && onOpenChange(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">Confirm Arbitrage Trade</h2>
          <p className="text-sm text-muted-foreground">
            Review the details of this arbitrage opportunity before executing the trade.
          </p>
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
            
            <span className="font-medium">Available Liquidity</span>
            <div className="text-muted-foreground">
              ${opportunity.liquidity?.toLocaleString() || 'Unknown'}
            </div>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <div className="font-medium">Investment Amount</div>
            <Input
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
            <div className="font-medium">Advanced Mode</div>
            <Switch
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
            />
          </div>
          
          {advancedMode && (
            <div className="space-y-4 border rounded-lg p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Slippage Tolerance ({slippageTolerance}%)</div>
                </div>
                <div className="flex items-center gap-2">
                  <Slider
                    defaultValue={[slippageTolerance]}
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    onValueChange={handleSlippageChange}
                  />
                  <div className="w-12 text-right">{slippageTolerance}%</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Estimated Price Impact</div>
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

          {transactionStatus === 'pending' && (
            <div className="space-y-2">
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <AlertTitle>Processing transaction</AlertTitle>
                <AlertDescription>Please wait while the trade is being executed...</AlertDescription>
              </Alert>
              <div className="space-y-1">
                <Progress value={executionProgress} />
                <p className="text-sm text-muted-foreground">{executionStep}</p>
              </div>
            </div>
          )}

          {transactionStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>The trade has been successfully executed.</AlertDescription>
            </Alert>
          )}

          {transactionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Failed to execute the trade. Please try again.</AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <Info className="h-4 w-4 mr-2" />
            <AlertDescription className="text-xs">
              By executing this trade, you authorize Tradenly to initiate transactions on your behalf using your connected wallet.
              A platform fee of 0.5% will be collected from successful arbitrage trades.
            </AlertDescription>
          </Alert>
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
