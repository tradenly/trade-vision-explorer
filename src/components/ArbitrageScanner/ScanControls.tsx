
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenInfo } from '@/services/tokenListService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ScanControlsProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  onScan: () => void;
  loading: boolean;
  scanError: string | null;
  profitThreshold?: number;
  onOpenSettings?: () => void;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  baseToken,
  quoteToken,
  onScan,
  loading,
  scanError,
  profitThreshold = 0.5,
  onOpenSettings
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          {baseToken && quoteToken && (
            <p className="text-sm text-muted-foreground">
              Scanning for {baseToken.symbol}/{quoteToken.symbol} with profit threshold of {profitThreshold}%
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={onOpenSettings}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Arbitrage Scan Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <Button 
            onClick={onScan} 
            disabled={!baseToken || !quoteToken || loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan for Opportunities
              </>
            )}
          </Button>
        </div>
      </div>
      
      {scanError && (
        <Alert variant="destructive">
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ScanControls;
