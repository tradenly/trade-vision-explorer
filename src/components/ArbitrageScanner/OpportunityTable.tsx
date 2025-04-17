
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, ArrowRightLeft, Scale, DollarSign, 
  CircleDollarSign, Droplets, TrendingUp 
} from 'lucide-react';
import { ArbitrageOpportunity } from '@/services/dexService';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpportunityTableProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  executing: string | null;
  onExecuteClick: (opportunity: ArbitrageOpportunity) => void;
  baseToken: string | null;
  quoteToken: string | null;
  investmentAmount?: number;
}

const OpportunityTable: React.FC<OpportunityTableProps> = ({
  opportunities,
  loading,
  executing,
  onExecuteClick,
  baseToken,
  quoteToken,
  investmentAmount = 1000,
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
            <TableHead>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>Buy On</span>
              </div>
            </TableHead>
            <TableHead>Buy Price</TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>Sell On</span>
              </div>
            </TableHead>
            <TableHead>Sell Price</TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Scale className="w-4 h-4" />
                <span>Fees</span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <Droplets className="w-4 h-4" />
                <span>Liquidity</span>
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>Profit</span>
              </div>
            </TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((op) => {
            const totalFees = op.tradingFees + op.gasFee + op.platformFee;
            
            return (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.tokenPair}</TableCell>
                <TableCell>{op.buyDex}</TableCell>
                <TableCell>${op.buyPrice.toFixed(4)}</TableCell>
                <TableCell>{op.sellDex}</TableCell>
                <TableCell>${op.sellPrice.toFixed(4)}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>${totalFees.toFixed(2)}</span>
                      </TooltipTrigger>
                      <TooltipContent className="w-60">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Trading Fees:</span>
                            <span>${op.tradingFees.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Gas Fee:</span>
                            <span>${op.gasFee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Platform Fee:</span>
                            <span>${op.platformFee.toFixed(2)}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>${(op.liquidity || 0).toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${op.estimatedProfit.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-xs mt-1">
                      {op.estimatedProfitPercentage.toFixed(2)}%
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {op.network}
                  </Badge>
                </TableCell>
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default OpportunityTable;
