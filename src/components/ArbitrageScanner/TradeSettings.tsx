
import React from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TradeSettingsProps {
  customAmount: number;
  slippageTolerance: number;
  advancedMode: boolean;
  buyPriceImpact: number;
  maxTradeSize?: number;
  executing: string | null;
  onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlippageChange: (value: number[]) => void;
  onAdvancedModeChange: (value: boolean) => void;
}

const TradeSettings: React.FC<TradeSettingsProps> = ({
  customAmount,
  slippageTolerance,
  advancedMode,
  buyPriceImpact,
  maxTradeSize = 0,
  executing,
  onCustomAmountChange,
  onSlippageChange,
  onAdvancedModeChange
}) => {
  const isPriceImpactHigh = buyPriceImpact > 2;
  const isTradeAmountExcessive = maxTradeSize > 0 && customAmount > maxTradeSize;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Custom Amount</Label>
          {maxTradeSize > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">
                    Max: ${maxTradeSize.toFixed(2)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs max-w-xs">
                    Maximum recommended trade size based on available liquidity and price impact.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Input
          type="number"
          value={customAmount}
          onChange={onCustomAmountChange}
          disabled={!!executing}
          className={isTradeAmountExcessive ? "border-amber-500" : ""}
          placeholder="Enter custom amount..."
        />
        
        {isTradeAmountExcessive && (
          <div className="flex items-center text-amber-500 text-xs mt-1">
            <AlertTriangle className="h-3 w-3 mr-2" />
            Trade amount exceeds recommended maximum
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Slippage Tolerance: {slippageTolerance}%</Label>
        <Slider
          value={[slippageTolerance]}
          onValueChange={onSlippageChange}
          min={0.1}
          max={5}
          step={0.1}
          disabled={!!executing}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.1%</span>
          <span>5%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Advanced Mode</Label>
          <div className="text-[0.8rem] text-muted-foreground">
            Enable high-risk trades
          </div>
        </div>
        <Switch
          checked={advancedMode}
          onCheckedChange={onAdvancedModeChange}
          disabled={!!executing}
        />
      </div>

      {isPriceImpactHigh && !advancedMode && (
        <div className="flex items-center text-amber-500 text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          High price impact detected. Enable Advanced Mode to proceed.
        </div>
      )}
      
      {isPriceImpactHigh && advancedMode && (
        <div className="flex items-center text-amber-500 text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          High price impact detected. Trade carefully.
        </div>
      )}
      
      {isTradeAmountExcessive && advancedMode && (
        <div className="flex items-center text-amber-500 text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Trade size exceeds recommended maximum. Consider reducing.
        </div>
      )}
    </div>
  );
};

export default TradeSettings;
