
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRightLeft, Scale, DollarSign, CircleDollarSign, Droplets } from 'lucide-react';
import { ArbitrageOpportunity } from '@/services/dexService';

interface OpportunityTableProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  executing: string | null;
  onExecuteClick: (opportunity: ArbitrageOpportunity) => void;
  baseToken: string | null;
  quoteToken: string | null;
}

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  opportunities,
  loading,
  executing,
  onExecuteClick,
  baseToken,
  quoteToken,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (opportunities.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {baseToken && quoteToken ? 
          "No arbitrage opportunities found. Click \"Scan for Opportunities\" to start scanning." :
          "Please select base and quote tokens to scan for opportunities."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token Pair</TableHead>
            <TableHead>Buy On</TableHead>
            <TableHead>Buy Price</TableHead>
            <TableHead>Sell On</TableHead>
            <TableHead>Sell Price</TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>Trading Fees</span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Scale className="w-4 h-4" />
                <span>Gas Fee</span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <CircleDollarSign className="w-4 h-4" />
                <span>Platform Fee</span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Droplets className="w-4 h-4" />
                <span>Liquidity</span>
              </div>
            </TableHead>
            <TableHead>Est. Profit</TableHead>
            <TableHead>ROI %</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((op) => (
            <TableRow key={op.id}>
              <TableCell>{op.tokenPair}</TableCell>
              <TableCell>{op.buyDex}</TableCell>
              <TableCell>${op.buyPrice.toFixed(4)}</TableCell>
              <TableCell>{op.sellDex}</TableCell>
              <TableCell>${op.sellPrice.toFixed(4)}</TableCell>
              <TableCell>${op.tradingFees.toFixed(2)}</TableCell>
              <TableCell>${op.gasFee.toFixed(2)}</TableCell>
              <TableCell>${op.platformFee.toFixed(2)}</TableCell>
              <TableCell>${(op.liquidity || 0).toLocaleString()}</TableCell>
              <TableCell className="font-medium text-green-600 dark:text-green-400">
                ${op.estimatedProfit.toFixed(2)}
              </TableCell>
              <TableCell className="font-medium">
                {op.estimatedProfitPercentage.toFixed(2)}%
              </TableCell>
              <TableCell className="capitalize">{op.network}</TableCell>
              <TableCell>
                <Button 
                  size="sm"
                  onClick={() => onExecuteClick(op)}
                  disabled={executing === op.id}
                  className="whitespace-nowrap"
                >
                  {executing === op.id ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-1 h-3 w-3" /> 
                      Execute Trade
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OpportunityTable;
