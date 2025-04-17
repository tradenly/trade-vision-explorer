
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Settings, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenInfo } from '@/services/tokenListService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ScanControlsProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  onScan: () => void;
  loading: boolean;
  scanError: string | null;
  profitThreshold?: number;
  onOpenSettings?: () => void;
  network?: string;
  dexCount?: number;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  baseToken,
  quoteToken,
  onScan,
  loading,
  scanError,
  profitThreshold = 0.5,
  onOpenSettings,
  network = 'unknown',
  dexCount = 0
}) => {
  const { toast } = useToast();
  
  // Network-specific information
  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'ethereum': return 'bg-blue-500';
      case 'bnb': return 'bg-yellow-500';
      case 'solana': return 'bg-purple-500';
      case 'polygon': return 'bg-indigo-500';
      case 'arbitrum': return 'bg-blue-700';
      case 'optimism': return 'bg-red-500';
      case 'base': return 'bg-blue-400';
      default: return 'bg-gray-500';
    }
  };

  const networkColor = getNetworkColor(network);
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          {baseToken && quoteToken && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Scanning for arbitrage opportunities:
                </p>
                <Badge variant="outline" className="font-medium">
                  {baseToken.symbol}/{quoteToken.symbol}
                </Badge>
                
                <Badge variant="outline" className={`${networkColor} text-white border-none`}>
                  {network}
                </Badge>
                
                {dexCount > 0 && (
                  <Badge variant="outline">
                    {dexCount} DEXs
                  </Badge>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6" 
                        onClick={() => {
                          toast({
                            title: "Profit Threshold",
                            description: `Only opportunities with at least ${profitThreshold}% profit after fees will be shown.`,
                          });
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Profit Threshold: {profitThreshold}%</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Transactions on {network} with profit threshold of {profitThreshold}%
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2 md:mt-0">
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
            variant="default"
            className={network.toLowerCase() === 'solana' ? 'bg-purple-600 hover:bg-purple-700' : ''}
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
