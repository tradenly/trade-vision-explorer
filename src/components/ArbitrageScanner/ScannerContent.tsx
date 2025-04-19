
import React from 'react';
import { CardContent } from '@/components/ui/card';
import TokenPairSelector from '@/components/TokenSelector/TokenPairSelector';
import { ScanControls } from './ScanControls';
import { OpportunityTabs } from './OpportunityTabs';
import { TokenInfo } from '@/services/tokenListService';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/arbitrage/types';
import { ChainId } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';

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
  onRefreshPrices?: () => void;
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
  onRefreshPrices,
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

      {baseToken && quoteToken && Object.keys(realTimePrices).length > 0 && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Real-Time DEX Prices</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRefreshPrices}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(realTimePrices).map(([dexName, quote]) => (
              <div key={dexName} className={`p-3 rounded-lg ${quote.isMock ? 'bg-amber-100 dark:bg-amber-900/20' : quote.isFallback ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-muted'}`}>
                <div className="font-medium">{dexName}</div>
                <div className="text-lg font-bold">${formatNumber(quote.price)}</div>
                <div className="flex text-xs text-muted-foreground justify-between">
                  <span>Updated: {getTimeSinceUpdate(quote.timestamp)}</span>
                  <span className="text-muted-foreground">Fee: {(quote.fees*100).toFixed(2)}%</span>
                </div>
                {quote.liquidityUSD && (
                  <div className="text-xs text-muted-foreground">
                    Liquidity: ${(quote.liquidityUSD / 1000).toFixed(1)}k
                  </div>
                )}
                {quote.isMock && (
                  <div className="text-[10px] text-amber-600">Mock data</div>
                )}
                {quote.isFallback && !quote.isMock && (
                  <div className="text-[10px] text-blue-600">Historical</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            <p>* All prices are updated in real-time from public DEX APIs. Price differences may indicate arbitrage opportunities.</p>
          </div>
        </div>
      )}
    </div>
  );
};
