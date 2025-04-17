
import React from 'react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OpportunityTableProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  executing: string | null;
  onExecuteClick: (opportunity: ArbitrageOpportunity) => void;
  baseToken: string | null;
  quoteToken: string | null;
  investmentAmount: number;
}

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  opportunities,
  loading,
  executing,
  onExecuteClick,
  baseToken,
  quoteToken,
  investmentAmount
}) => {
  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Scanning for opportunities...</h3>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buy on</TableHead>
              <TableHead>Sell on</TableHead>
              <TableHead className="text-right">Price diff</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Liquidity</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(3).fill(0).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!opportunities.length) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium mb-2">No arbitrage opportunities found</h3>
        <p className="text-sm text-muted-foreground">
          Try selecting different tokens or check again later.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Arbitrage Opportunities</h3>
          <div className="text-sm text-muted-foreground">
            Found {opportunities.length} opportunities
          </div>
        </div>
        {baseToken && quoteToken && (
          <p className="text-sm text-muted-foreground">
            For {baseToken}/{quoteToken} with {formatCurrency(investmentAmount)} investment
          </p>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buy on</TableHead>
              <TableHead>Sell on</TableHead>
              <TableHead className="text-right">Buy Price</TableHead>
              <TableHead className="text-right">Sell Price</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Liquidity</TableHead>
              <TableHead className="text-right">Network</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.map((opp) => (
              <TableRow key={opp.id}>
                <TableCell>{opp.buyDex}</TableCell>
                <TableCell>{opp.sellDex}</TableCell>
                <TableCell className="text-right">{formatCurrency(opp.buyPrice)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(opp.sellPrice)}
                    {opp.sellPrice > opp.buyPrice ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col text-xs">
                    <span>Trading: {formatCurrency(opp.tradingFees)}</span>
                    <span>Gas: {formatCurrency(opp.gasFee)}</span>
                    <span>Platform: {formatCurrency(opp.platformFee)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <Badge variant={opp.estimatedProfit > 0 ? "success" : "destructive"}>
                      {opp.estimatedProfitPercentage.toFixed(2)}%
                    </Badge>
                    <span className="text-xs mt-1">{formatCurrency(opp.estimatedProfit)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-xs">
                    <div>Buy: {formatCurrency(opp.liquidity || 0)}</div>
                    <div>Sell: {formatCurrency(opp.liquidity || 0)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={opp.network === 'solana' ? 'secondary' : 'default'}>
                    {opp.network}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    onClick={() => onExecuteClick(opp)}
                    disabled={executing === opp.id}
                    variant="secondary"
                  >
                    {executing === opp.id ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Executing
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft className="mr-1 h-3 w-3" />
                        Execute
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OpportunityTable;
