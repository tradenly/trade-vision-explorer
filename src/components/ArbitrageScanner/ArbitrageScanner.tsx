
import React, { useState } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity, scanForArbitrageOpportunities } from '@/services/dexService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ArbitrageScannerProps {
  selectedToken: TokenInfo | null;
  quoteToken?: TokenInfo;
  investmentAmount?: number;
}

const ArbitrageScanner: React.FC<ArbitrageScannerProps> = ({
  selectedToken,
  quoteToken,
  investmentAmount = 1000
}) => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!selectedToken) {
      toast({
        title: "No token selected",
        description: "Please select a token to scan for arbitrage opportunities",
        variant: "destructive"
      });
      return;
    }
    
    // Default quote token based on chain if not provided
    const defaultQuoteToken: TokenInfo = {
      name: selectedToken.chainId === 101 ? 'USDC' : 'USDT',
      symbol: selectedToken.chainId === 101 ? 'USDC' : 'USDT',
      address: '0x00',
      chainId: selectedToken.chainId,
      decimals: 6
    };
    
    setLoading(true);
    try {
      const results = await scanForArbitrageOpportunities(
        selectedToken,
        quoteToken || defaultQuoteToken,
        investmentAmount
      );
      
      setOpportunities(results);
      
      if (results.length === 0) {
        toast({
          title: "No opportunities found",
          description: "Try a different token or check again later",
        });
      } else {
        toast({
          title: `Found ${results.length} opportunities`,
          description: "Review the arbitrage opportunities below",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error during scan:', error);
      toast({
        title: "Scan failed",
        description: "There was an error during the scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Arbitrage Scanner</CardTitle>
          <Button 
            onClick={handleScan} 
            disabled={!selectedToken || loading}
            className="ml-2"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan for Opportunities
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedToken ? (
          <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <p>Scanning for arbitrage opportunities with {selectedToken.symbol} ({selectedToken.name})</p>
            <p className="text-sm text-muted-foreground">Investment amount: ${investmentAmount.toLocaleString()}</p>
          </div>
        ) : (
          <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p>Select a token from the dropdown above to scan for arbitrage opportunities</p>
          </div>
        )}

        {opportunities.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token Pair</TableHead>
                  <TableHead>Buy On</TableHead>
                  <TableHead>Sell On</TableHead>
                  <TableHead>Buy Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead>Est. Profit</TableHead>
                  <TableHead>ROI %</TableHead>
                  <TableHead>Network</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.tokenPair}</TableCell>
                    <TableCell>{op.buyDex}</TableCell>
                    <TableCell>{op.sellDex}</TableCell>
                    <TableCell>${op.buyPrice.toFixed(4)}</TableCell>
                    <TableCell>${op.sellPrice.toFixed(4)}</TableCell>
                    <TableCell>${(op.gasFee + op.tradingFees).toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-green-600 dark:text-green-400">
                      ${op.estimatedProfit.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {op.estimatedProfitPercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className="capitalize">{op.network}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No arbitrage opportunities found. Click "Scan for Opportunities" to start scanning.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArbitrageScanner;
