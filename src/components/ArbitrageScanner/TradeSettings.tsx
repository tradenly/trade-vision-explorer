
import React from 'react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { TradeSettingsProps } from './types';

const TradeSettings: React.FC<TradeSettingsProps> = ({
  customAmount,
  slippageTolerance,
  advancedMode,
  buyPriceImpact,
  executing,
  onCustomAmountChange,
  onSlippageChange,
  onAdvancedModeChange
}) => {
  const isPriceImpactHigh = buyPriceImpact > 2;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Custom Amount</Label>
        <Input
          type="number"
          value={customAmount}
          onChange={onCustomAmountChange}
          disabled={!!executing}
          placeholder="Enter custom amount..."
        />
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

      {isPriceImpactHigh && advancedMode && (
        <div className="flex items-center text-amber-500 text-sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          High price impact detected. Trade carefully.
        </div>
      )}
    </div>
  );
};

export default TradeSettings;
