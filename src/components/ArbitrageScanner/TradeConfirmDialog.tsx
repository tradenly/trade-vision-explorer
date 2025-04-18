
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExecutionProgress } from '@/hooks/useExecutionProgress';
import { TransactionStatus } from '@/services/dex/types';
import TradeDetails from './TradeDetails';
import TradeSettings from './TradeSettings';
import TransactionStatusIndicator from './TransactionStatus';
import { FeeService } from '@/services/dex/services/FeeService';
import { PriceImpactService } from '@/services/dex/services/PriceImpactService';
import { LiquidityValidationService } from '@/services/dex/services/LiquidityValidationService';

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
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<number>(investmentAmount);
  const [buyPriceImpact, setBuyPriceImpact] = useState<number>(0);
  const [sellPriceImpact, setSellPriceImpact] = useState<number>(0);
  const [tradingFees, setTradingFees] = useState<number>(0);
  const [gasFees, setGasFees] = useState<number>(0);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [maxTradeSize, setMaxTradeSize] = useState<number>(0);
  const { toast } = useToast();
  
  // Initialize services
  const priceImpactService = PriceImpactService.getInstance();
  const feeService = FeeService.getInstance();
  const liquidityService = LiquidityValidationService.getInstance();
  
  const { progress, step } = useExecutionProgress(
    executing !== null,
    transactionStatus,
    opportunity
  );
  
  // Calculate fees and impacts when opportunity or amount changes
  useEffect(() => {
    const calculateFeesAndImpacts = async () => {
      if (!opportunity) return;
      
      const tradeAmount = customAmount || investmentAmount;
      
      try {
        // Get liquidity information
        const liquidityInfo = await liquidityService.validateArbitrageRoute(
          opportunity.baseToken,
          opportunity.quoteToken,
          opportunity.buyDex,
          opportunity.sellDex,
          tradeAmount
        );
        
        // Set price impacts
        setBuyPriceImpact(liquidityInfo.buyLiquidity.priceImpact);
        setSellPriceImpact(liquidityInfo.sellLiquidity.priceImpact);
        
        // Set max trade size
        setMaxTradeSize(Math.min(
          liquidityInfo.buyLiquidity.maxTradeSize,
          liquidityInfo.sellLiquidity.maxTradeSize
        ));
        
        // Calculate all fees
        const fees = await feeService.calculateAllFees(
          tradeAmount,
          opportunity.buyDex,
          opportunity.sellDex,
          opportunity.network
        );
        
        setTradingFees(fees.tradingFee);
        setGasFees(fees.gasFee);
        setPlatformFee(fees.platformFee);
      } catch (error) {
        console.error("Error calculating fees and impacts:", error);
        // Use fallback values from opportunity if calculation fails
        setBuyPriceImpact(opportunity.liquidityBuy 
          ? priceImpactService.calculatePriceImpact(tradeAmount, opportunity.liquidityBuy)
          : 0.3);
          
        setSellPriceImpact(opportunity.liquiditySell
          ? priceImpactService.calculatePriceImpact(tradeAmount, opportunity.liquiditySell)
          : 0.3);
          
        setTradingFees(opportunity.tradingFees);
        setGasFees(opportunity.gasFee);
        setPlatformFee(opportunity.platformFee);
      }
    };
    
    calculateFeesAndImpacts();
  }, [opportunity, customAmount, investmentAmount]);
  
  if (!opportunity) return null;
  
  const tradeAmount = customAmount || investmentAmount;
  const estimatedTokenAmount = tradeAmount / opportunity.buyPrice;
  
  const isPriceImpactHigh = buyPriceImpact > 2 || sellPriceImpact > 2;
  
  const handleSlippageChange = (value: number[]) => {
    setSlippageTolerance(value[0]);
  };
  
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setCustomAmount(value);
      
      if (value > maxTradeSize && maxTradeSize > 0) {
        toast({
          title: "Trade Size Warning",
          description: `Your trade size may cause high price impact. Consider reducing to $${maxTradeSize.toFixed(2)} or less.`,
          variant: "warning"
        });
      }
    } else {
      setCustomAmount(0);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(open) => !executing && onOpenChange(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Confirm Arbitrage Trade
          </h2>
          <p className="text-sm text-muted-foreground">
            Review the details of this arbitrage opportunity before executing the trade.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <TradeDetails 
            opportunity={opportunity}
            tradeAmount={tradeAmount}
            buyPriceImpact={buyPriceImpact}
            sellPriceImpact={sellPriceImpact}
            estimatedTokenAmount={estimatedTokenAmount}
            tradingFees={tradingFees}
            gasFees={gasFees}
            platformFee={platformFee}
            maxTradeSize={maxTradeSize}
          />

          <TradeSettings
            customAmount={customAmount}
            slippageTolerance={slippageTolerance}
            advancedMode={advancedMode}
            buyPriceImpact={buyPriceImpact}
            executing={executing}
            maxTradeSize={maxTradeSize}
            onCustomAmountChange={handleCustomAmountChange}
            onSlippageChange={handleSlippageChange}
            onAdvancedModeChange={setAdvancedMode}
          />

          <TransactionStatusIndicator
            transactionStatus={transactionStatus}
            progress={progress}
            step={step}
          />

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
          <Button 
            onClick={onConfirm} 
            disabled={!!executing || (isPriceImpactHigh && !advancedMode) || tradeAmount > maxTradeSize * 2}
          >
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
