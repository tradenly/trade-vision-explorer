
import React, { useState, useEffect } from 'react';
import { fetchArbitrageOpportunities } from '@/services/supabaseService';
import WalletSection from '@/components/WalletConnect/WalletSection';
import { TokenInfo } from '@/services/tokenListService';
import { toast } from '@/hooks/use-toast';
import TokenSelector from '@/components/TokenSelector/TokenSelector';
import PriceMonitor from '@/components/ArbitrageScanner/PriceMonitor';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import WelcomeSection from '@/components/Dashboard/WelcomeSection';
import ArbitrageOpportunities from '@/components/Dashboard/ArbitrageOpportunities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [investmentAmount] = useState<number>(1000);
  const [selectedBaseToken, setSelectedBaseToken] = useState<TokenInfo | null>(null);
  const [selectedQuoteToken, setSelectedQuoteToken] = useState<TokenInfo | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchArbitrageOpportunities();
        
        const enhancedData = data.map((opp: any) => ({
          ...opp,
          buy_price: opp.buy_price || parseFloat((Math.random() * 1000 + 1000).toFixed(2)),
          sell_price: opp.sell_price || parseFloat((Math.random() * 1000 + 1050).toFixed(2)),
          trading_fees: opp.trading_fees || parseFloat((Math.random() * 5 + 1).toFixed(2)),
          platform_fee: opp.platform_fee || 0.5,
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
      <DashboardHeader />
      <WalletSection />
      <WelcomeSection />
      
      <ArbitrageOpportunities
        opportunities={opportunities}
        loading={loading}
        error={error}
        investmentAmount={investmentAmount}
      />
      
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Price Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Base Token</label>
                <TokenSelector
                  selectedToken={selectedBaseToken}
                  onSelectToken={setSelectedBaseToken}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Quote Token</label>
                <TokenSelector
                  selectedToken={selectedQuoteToken}
                  onSelectToken={setSelectedQuoteToken}
                />
              </div>
            </div>
            <Button 
              onClick={() => setMonitoringActive(!monitoringActive)}
              variant={monitoringActive ? "destructive" : "default"}
            >
              {monitoringActive ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {(selectedBaseToken && selectedQuoteToken) && (
        <div className="mb-6">
          <PriceMonitor
            baseToken={selectedBaseToken}
            quoteToken={selectedQuoteToken}
            isActive={monitoringActive}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
