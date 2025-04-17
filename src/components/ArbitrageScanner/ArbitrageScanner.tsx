
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import TokenPairSelector from '@/components/TokenSelector/TokenPairSelector';
import { OpportunityList } from './OpportunityList';
import TradeConfirmDialog from './TradeConfirmDialog';
import { ArbitrageOpportunity } from '@/services/dexService';
import { useToast } from '@/hooks/use-toast';
import { TransactionStatus } from '@/services/dex/types';
import { TokenInfo } from '@/services/tokenListService';
import { ChainId } from '@/services/tokenListService';
import { useArbitrageScanner } from '@/hooks/useArbitrageScanner';

const ArbitrageScanner: React.FC = () => {
  const { toast } = useToast();
  const [selectedChain, setSelectedChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [minProfitPercentage, setMinProfitPercentage] = useState(0.5); // 0.5% minimum profit
  const [autoScan, setAutoScan] = useState(false);

  // Use our custom hook for scanning
  const { 
    opportunities, 
    loading, 
    error, 
    scanForOpportunities, 
    lastScanTime 
  } = useArbitrageScanner(baseToken, quoteToken, investmentAmount, minProfitPercentage, autoScan);

  const handleTokenPairSelect = (base: TokenInfo, quote: TokenInfo) => {
    setBaseToken(base);
    setQuoteToken(quote);
  };

  const handleChainChange = (chainId: ChainId) => {
    setSelectedChain(chainId);
    // Reset tokens when changing chains
    setBaseToken(null);
    setQuoteToken(null);
  };

  const handleScan = () => {
    if (!baseToken || !quoteToken) {
      toast({
        title: "Error",
        description: "Please select both base and quote tokens",
        variant: "destructive"
      });
      return;
    }

    scanForOpportunities();
  };

  const handleOpportunitySelect = (opportunity: ArbitrageOpportunity) => {
    setSelectedOpportunity(opportunity);
    setDialogOpen(true);
  };

  const handleExecuteTrade = async () => {
    if (!selectedOpportunity) return;

    setExecuting(selectedOpportunity.id);
    setTransactionStatus(TransactionStatus.PENDING);

    try {
      // This would be a real trade execution in a production app
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing time
      
      // Simulate success
      setTransactionStatus(TransactionStatus.SUCCESS);
      toast({
        title: "Trade Executed",
        description: `Successfully executed arbitrage trade with ${selectedOpportunity.estimatedProfit.toFixed(2)} profit`,
      });
    } catch (err) {
      console.error('Error executing trade:', err);
      setTransactionStatus(TransactionStatus.ERROR);
      toast({
        title: "Trade Failed",
        description: "Failed to execute arbitrage trade",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setExecuting(null);
        setDialogOpen(false);
        setTransactionStatus(TransactionStatus.IDLE);
        // Re-scan for opportunities after trade execution
        scanForOpportunities();
      }, 2000);
    }
  };

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Arbitrage Scanner</CardTitle>
          <CardDescription>
            Find and execute arbitrage opportunities across multiple DEXes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <TokenPairSelector 
              onSelectTokenPair={handleTokenPairSelect}
              selectedChain={selectedChain}
              onSelectChain={handleChainChange}
              investmentAmount={investmentAmount}
              onInvestmentAmountChange={setInvestmentAmount}
            />

            <div className="flex justify-between items-center">
              <Button 
                onClick={handleScan} 
                disabled={!baseToken || !quoteToken || loading}
                className="flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Scan for Opportunities
                  </>
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                {lastScanTime ? `Last scan: ${lastScanTime.toLocaleTimeString()}` : 'No scans yet'}
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 p-3 rounded-md flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="text-destructive">{error}</span>
              </div>
            )}

            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="low-risk">Low Risk</TabsTrigger>
                <TabsTrigger value="medium-risk">Medium Risk</TabsTrigger>
                <TabsTrigger value="high-risk">High Risk</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <OpportunityList 
                  opportunities={opportunities} 
                  onSelect={handleOpportunitySelect} 
                />
              </TabsContent>
              
              <TabsContent value="low-risk">
                <OpportunityList 
                  opportunities={opportunities.filter(opp => opp.estimatedProfitPercentage >= 2)} 
                  onSelect={handleOpportunitySelect} 
                />
              </TabsContent>
              
              <TabsContent value="medium-risk">
                <OpportunityList 
                  opportunities={opportunities.filter(opp => 
                    opp.estimatedProfitPercentage >= 1 && opp.estimatedProfitPercentage < 2
                  )} 
                  onSelect={handleOpportunitySelect} 
                />
              </TabsContent>
              
              <TabsContent value="high-risk">
                <OpportunityList 
                  opportunities={opportunities.filter(opp => opp.estimatedProfitPercentage < 1)} 
                  onSelect={handleOpportunitySelect} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <TradeConfirmDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        opportunity={selectedOpportunity}
        onConfirm={handleExecuteTrade}
        executing={executing}
        transactionStatus={transactionStatus}
        investmentAmount={investmentAmount}
      />
    </div>
  );
};

export default ArbitrageScanner;
