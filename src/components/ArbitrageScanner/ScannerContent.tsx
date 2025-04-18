
import React from 'react';
import { CardContent } from '@/components/ui/card';
import TokenPairSelector from '@/components/TokenSelector/TokenPairSelector';
import { ScanControls } from './ScanControls';
import { OpportunityTabs } from './OpportunityTabs';
import { TokenInfo } from '@/services/tokenListService';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { ChainId } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';

interface ScannerContentProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  loading: boolean;
  error: string | null;
  opportunities: ArbitrageOpportunity[];
  lastScanTime: Date | null;
  selectedChain: ChainId;
  investmentAmount: number;
  onTokenPairSelect: (base: TokenInfo, quote: TokenInfo) => void;
  onChainChange: (chainId: ChainId) => void;
  onInvestmentAmountChange: (amount: number) => void;
  onScan: () => void;
  onOpportunitySelect: (opportunity: ArbitrageOpportunity) => void;
  realTimePrices?: Record<string, PriceQuote>;
}

export const ScannerContent: React.FC<ScannerContentProps> = ({
  baseToken,
  quoteToken,
  loading,
  error,
  opportunities,
  lastScanTime,
  selectedChain,
  investmentAmount,
  onTokenPairSelect,
  onChainChange,
  onInvestmentAmountChange,
  onScan,
  onOpportunitySelect,
  realTimePrices = {},
}) => {
  // Format price update time
  const formatUpdateTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };
  
  // Calculate time since last update
  const getTimeSinceUpdate = (timestamp?: number) => {
    if (!timestamp) return '';
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    
    if (secondsAgo < 10) return 'just now';
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    if (secondsAgo < 120) return '1 minute ago';
    return `${Math.floor(secondsAgo / 60)} minutes ago`;
  };

  return (
    <div>
      <CardContent>
        <div className="space-y-6">
          <TokenPairSelector 
            onSelectTokenPair={onTokenPairSelect}
            selectedChain={selectedChain}
            onSelectChain={onChainChange}
            investmentAmount={investmentAmount}
            onInvestmentAmountChange={onInvestmentAmountChange}
          />

          <ScanControls 
            loading={loading}
            onScan={onScan}
            lastScanTime={lastScanTime}
            disabled={!baseToken || !quoteToken}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <OpportunityTabs 
            opportunities={opportunities} 
            onSelect={onOpportunitySelect}
          />
        </div>
      </CardContent>

      {Object.keys(realTimePrices).length > 0 && (
        <div className="mt-4 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Real-Time Prices</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(realTimePrices).map(([dexName, quote]) => (
              <div key={dexName} className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{dexName}</div>
                <div className="text-lg font-bold">${quote.price.toFixed(6)}</div>
                <div className="text-xs text-muted-foreground">
                  Updated: {getTimeSinceUpdate(quote.timestamp)}
                </div>
                {quote.liquidityUSD && (
                  <div className="text-xs text-muted-foreground">
                    Liquidity: ${(quote.liquidityUSD / 1000).toFixed(1)}k
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
