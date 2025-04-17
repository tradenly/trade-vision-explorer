
import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';

interface TradeSettingsProps {
  customAmount: number;
  slippageTolerance: number;
  advancedMode: boolean;
  buyPriceImpact: number;
  executing: string | null;
  onCustomAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlippageChange: (value: number[]) => void;
  onAdvancedModeChange: (checked: boolean) => void;
}

const TradeSettings: React.FC<TradeSettingsProps> = ({
  customAmount,
  slippageTolerance,
  advancedMode,
  buyPriceImpact,
  executing,
  onCustomAmountChange,
  onSlippageChange,
  onAdvancedModeChange,
}) => {
  const isPriceImpactHigh = buyPriceImpact > 2;
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="font-medium">Investment Amount</div>
        <Input
          type="number"
          value={customAmount}
          onChange={onCustomAmountChange}
          disabled={executing !== null}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="font-medium">Advanced Mode</div>
        <Switch
          checked={advancedMode}
          onCheckedChange={onAdvancedModeChange}
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
                onValueChange={onSlippageChange}
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
    </div>
  );
};

export default TradeSettings;
