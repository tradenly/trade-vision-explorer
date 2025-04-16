
import React, { useState, useEffect } from 'react';
import { fetchArbitrageOpportunities } from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WalletSection from '@/components/WalletConnect/WalletSection';
import TokenSelector from '@/components/TokenSelector/TokenSelector';
import { ChainId, TokenInfo } from '@/services/tokenListService';
import ArbitrageScanner from '@/components/ArbitrageScanner/ArbitrageScanner';
import PriceChart from '@/components/PriceChart/PriceChart';

interface ArbitrageOpportunity {
  id: string;
  token_pair: string;
  buy_exchange: string;
  sell_exchange: string;
  price_diff: number;
  estimated_profit: string;
  network: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchArbitrageOpportunities();
        setOpportunities(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load opportunities:', err);
        setError('Failed to load data from Supabase');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    console.log('Selected token:', token);
  };

  const handleChainSelect = (chainId: ChainId) => {
    setSelectedChain(chainId);
    setSelectedToken(null);
    console.log('Selected chain:', chainId);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Wallet Connection Section */}
      <WalletSection />
      
      {/* Token Selection Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Token for Arbitrage Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          <TokenSelector 
            onSelectToken={handleTokenSelect} 
            selectedChain={selectedChain}
            onSelectChain={handleChainSelect}
          />
          
          {selectedToken && (
            <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <h3 className="font-medium">Selected Token:</h3>
              <div className="flex items-center mt-2">
                {selectedToken.logoURI && (
                  <img 
                    src={selectedToken.logoURI} 
                    alt={selectedToken.name} 
                    className="w-6 h-6 mr-2 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <p className="font-bold">{selectedToken.symbol}</p>
                  <p className="text-sm text-gray-500">{selectedToken.name}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Chart Component */}
      <PriceChart 
        baseToken={selectedToken} 
      />
      
      {/* Arbitrage Scanner Component */}
      <ArbitrageScanner 
        selectedToken={selectedToken} 
        investmentAmount={investmentAmount} 
      />
      
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        <p className="font-bold">Connected to Supabase</p>
        <p>Your application is successfully connected to your Supabase project.</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <p className="text-gray-500">Loading data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">Sample Arbitrage Opportunities (from Supabase)</h2>
          {opportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((opportunity) => (
                <Card key={opportunity.id} className="p-4">
                  <h3 className="font-bold">{opportunity.token_pair}</h3>
                  <p>Buy on: <span className="font-medium">{opportunity.buy_exchange}</span></p>
                  <p>Sell on: <span className="font-medium">{opportunity.sell_exchange}</span></p>
                  <p>Price Difference: <span className="font-medium">{opportunity.price_diff}%</span></p>
                  <p>Est. Profit: <span className="font-medium">{opportunity.estimated_profit}</span></p>
                  <p>Network: <span className="font-medium">{opportunity.network}</span></p>
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      opportunity.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {opportunity.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p>No arbitrage opportunities found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
