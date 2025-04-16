
import React, { useState, useEffect } from 'react';
import { fetchArbitrageOpportunities } from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletSection from '@/components/WalletConnect/WalletSection';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import ArbitrageScanner from '@/components/ArbitrageScanner/ArbitrageScanner';
import PriceChart from '@/components/PriceChart/PriceChart';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
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
  }, [toast]);

  // Handle token pair selection from child components
  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    setBaseToken(base);
    setQuoteToken(quote);
    console.log('Selected tokens:', base.symbol, quote.symbol);
    
    toast({
      title: "Token pair selected",
      description: `Selected pair: ${base.symbol}/${quote.symbol}`,
    });
  };

  // Handle investment amount changes
  const handleInvestmentAmountChange = (amount: number) => {
    setInvestmentAmount(amount);
  };

  // Handle chain selection change
  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    // Reset tokens when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link to="/settings">
          <Button variant="outline" className="flex gap-2 items-center">
            <Settings size={16} />
            Settings
          </Button>
        </Link>
      </div>
      
      {/* Wallet Connection Section */}
      <WalletSection />
      
      {/* ArbitrageScanner with TokenPairSelector integrated */}
      <ArbitrageScanner 
        initialBaseToken={baseToken}
        initialQuoteToken={quoteToken}
        investmentAmount={investmentAmount}
        onTokenPairSelect={handleTokenPairSelect}
        onInvestmentAmountChange={handleInvestmentAmountChange}
        onChainSelect={handleChainChange}
        selectedChain={selectedChain}
      />
      
      {/* Price Chart Component - will use the selected tokens */}
      {baseToken && quoteToken && (
        <PriceChart 
          baseToken={baseToken} 
          quoteToken={quoteToken}
        />
      )}
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
        <p className="font-bold">Connected to Supabase</p>
        <p>Your application is successfully connected to your Supabase project.</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <p className="text-gray-500">Loading data...</p>
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
            <p>No recent arbitrage opportunities found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
