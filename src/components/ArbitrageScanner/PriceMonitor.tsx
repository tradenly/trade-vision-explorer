
import React from 'react';
import { usePriceMonitor } from '@/hooks/usePriceMonitor';
import { useRealTimePrices } from '@/hooks/useRealTimePrices'; // Import new hook
import { TokenInfo } from '@/services/tokenListService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatTokenPrice } from '@/lib/utils';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PriceMonitorProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  isActive: boolean;
}

const PriceMonitor: React.FC<PriceMonitorProps> = ({
  baseToken,
  quoteToken,
  isActive
}) => {
  // Use our new real-time price hook instead of the old one
  const { prices: realTimePrices, loading, error, refetch } = useRealTimePrices(
    baseToken, 
    quoteToken, 
    isActive ? 10000 : 0 // Only poll if active
  );

  if (!baseToken || !quoteToken) {
    return null;
  }

  // Format time since update
  const getTimeSinceUpdate = (timestamp?: number) => {
    if (!timestamp) return '';
    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
    
    if (secondsAgo < 10) return 'just now';
    if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
    if (secondsAgo < 120) return '1 minute ago';
    return `${Math.floor(secondsAgo / 60)} minutes ago`;
  };

  // Handler to manually refresh prices
  const handleRefresh = () => {
    refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          Real-time Prices: {baseToken.symbol}/{quoteToken.symbol}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} size={18} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && Object.keys(realTimePrices).length === 0 ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading prices...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm p-4">
            <p>Error loading prices: {error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2" 
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(realTimePrices).map(([dex, quote]) => (
              <div key={dex} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-medium capitalize">{dex}</span>
                  {(quote.isFallback || quote.isMock) && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {quote.isMock ? 'Simulated' : 'Historical'}
                    </Badge>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Liquidity: ${formatNumber(quote.liquidityUSD || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ${formatTokenPrice(quote.price, quoteToken.symbol)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Updated: {getTimeSinceUpdate(quote.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(realTimePrices).length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No price data available. Please check your connection or try again later.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceMonitor;
