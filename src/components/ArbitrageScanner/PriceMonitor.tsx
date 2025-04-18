
import React from 'react';
import { usePriceMonitor } from '@/hooks/usePriceMonitor';
import { TokenInfo } from '@/services/tokenListService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatTokenPrice } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
  const { priceData, loading, error } = usePriceMonitor(baseToken, quoteToken, isActive);

  if (!baseToken || !quoteToken) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Real-time Prices: {baseToken.symbol}/{quoteToken.symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">{error}</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(priceData).map(([dex, quote]) => (
              <div key={dex} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-medium">{dex}</span>
                  <div className="text-sm text-muted-foreground">
                    Liquidity: ${formatNumber(quote.liquidity || 0)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    ${formatTokenPrice(quote.price, baseToken.symbol)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Fee: {((quote.fees || 0) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceMonitor;
