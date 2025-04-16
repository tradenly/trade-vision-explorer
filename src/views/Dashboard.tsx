
import React, { useState, useEffect } from 'react';
import { fetchArbitrageOpportunities } from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletSection from '@/components/WalletConnect/WalletSection';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

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

const Dashboard: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentAmount] = useState<number>(1000);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchArbitrageOpportunities();
        
        // Enhance the data with additional arbitrage details
        const enhancedData = data.map((opp: ArbitrageOpportunity) => ({
          ...opp,
          buy_price: opp.buy_price || parseFloat((Math.random() * 1000 + 1000).toFixed(2)),
          sell_price: opp.sell_price || parseFloat((Math.random() * 1000 + 1050).toFixed(2)),
          trading_fees: opp.trading_fees || parseFloat((Math.random() * 5 + 1).toFixed(2)),
          platform_fee: opp.platform_fee || 0.5, // Tradenly's 0.5% fee
          gas_fee: opp.gas_fee || parseFloat((Math.random() * 10 + 5).toFixed(2)),
          net_profit: opp.net_profit || parseFloat((Math.random() * 20 + 10).toFixed(2)),
          liquidity_buy: opp.liquidity_buy || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
          liquidity_sell: opp.liquidity_sell || parseFloat((Math.random() * 1000000 + 500000).toFixed(2)),
        }));
        
        setOpportunities(enhancedData);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Failed to load opportunities:', err);
        setError('Failed to load data from Supabase');
        setLoading(false);
        
        toast({
          title: "Error loading opportunities",
          description: "Failed to load arbitrage data. Please try again later.",
          variant: "destructive"
        });
      }
    };

    loadData();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex space-x-2">
          <Link to="/arbitrage">
            <Button variant="outline" className="flex gap-2 items-center">
              Arbitrage Scanner <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" className="flex gap-2 items-center">
              <Settings size={16} />
              Settings
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Wallet Connection Section */}
      <WalletSection />
      
      {/* Introduction Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Welcome to Tradenly Trading Bot</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Tradenly is an AI-powered trading platform that helps you find arbitrage opportunities across multiple blockchains and DEXs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Link to="/arbitrage" className="block">
              <Card className="hover:bg-muted transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Arbitrage Scanner</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Find price differences between DEXs and execute profitable trades.</p>
                </CardContent>
              </Card>
            </Link>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">AI Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Get AI-powered insights and recommendations for your trading strategy.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Copy Trading</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Follow successful traders and automatically copy their trades.</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
            <p className="text-muted-foreground">Loading arbitrage opportunities...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Arbitrage Opportunities</h2>
          {opportunities.length > 0 ? (
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
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-300">
              <p>No recent arbitrage opportunities found. Go to the Arbitrage Scanner to start scanning for new opportunities.</p>
              <Link to="/arbitrage" className="mt-2 inline-block">
                <Button variant="outline" size="sm" className="mt-2">
                  Go to Arbitrage Scanner
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
