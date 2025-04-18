
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ArbitrageOpportunity {
  id: string;
  token_pair: string;
  buy_exchange: string;
  sell_exchange: string;
  price_diff: number;
  estimated_profit: string;
  network: string;
  status: string;
  buy_price?: number;
  sell_price?: number;
  trading_fees?: number;
  platform_fee?: number;
  gas_fee?: number;
  net_profit?: number;
  liquidity_buy?: number;
  liquidity_sell?: number;
}

interface ArbitrageOpportunitiesProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  error: string | null;
  investmentAmount: number;
}

const ArbitrageOpportunities = ({
  opportunities,
  loading,
  error,
  investmentAmount
}: ArbitrageOpportunitiesProps) => {
  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
          <p className="text-muted-foreground">Loading arbitrage opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-300">
        <p>No recent arbitrage opportunities found. Go to the Arbitrage Scanner to start scanning for new opportunities.</p>
        <Link to="/arbitrage" className="mt-2 inline-block">
          <Button variant="outline" size="sm" className="mt-2">
            Go to Arbitrage Scanner
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Recent Arbitrage Opportunities</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{opportunity.token_pair}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  opportunity.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {opportunity.status}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buy on:</span>
                    <span className="font-medium">{opportunity.buy_exchange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buy price:</span>
                    <span className="font-medium">${opportunity.buy_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidity:</span>
                    <span className="font-medium">${opportunity.liquidity_buy?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trading fee:</span>
                    <span className="font-medium">{opportunity.trading_fees}%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sell on:</span>
                    <span className="font-medium">{opportunity.sell_exchange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sell price:</span>
                    <span className="font-medium">${opportunity.sell_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidity:</span>
                    <span className="font-medium">${opportunity.liquidity_sell?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price difference:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{opportunity.price_diff}%</span>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas fees:</span>
                  <span className="font-medium">${opportunity.gas_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tradenly platform fee (0.5%):</span>
                  <span className="font-medium">${(investmentAmount * 0.005).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Estimated net profit:</span>
                  <span className="text-green-600 dark:text-green-400">${opportunity.net_profit}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Expected ROI:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {((opportunity.net_profit! / investmentAmount) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <Button className="w-full">Execute Trade</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ArbitrageOpportunities;
