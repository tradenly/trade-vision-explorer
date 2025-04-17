
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2, ChevronDown, ChevronUp, Info, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency, formatPercentage } from '@/lib/utils';

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
  investmentAmount,
}) => {
  const [openDetailRows, setOpenDetailRows] = React.useState<Record<string, boolean>>({});
  
  const toggleDetailRow = (id: string) => {
    setOpenDetailRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper function to get network-specific styling
  const getNetworkBadgeStyle = (network: string) => {
    switch (network.toLowerCase()) {
      case 'ethereum': return 'bg-blue-500';
      case 'bnb': return 'bg-yellow-500';
      case 'solana': return 'bg-purple-500';
      case 'polygon': return 'bg-indigo-500';
      case 'arbitrum': return 'bg-blue-700';
      case 'optimism': return 'bg-red-500';
      case 'base': return 'bg-blue-400';
      default: return 'bg-gray-500';
    }
  };
  
  // Helper function to format large numbers (for liquidity)
  const formatLiquidity = (value?: number): string => {
    if (!value) return 'Unknown';
    
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Scanning for arbitrage opportunities...</p>
      </div>
    );
  }
  
  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No arbitrage opportunities found. Try scanning with different tokens or scan again later.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead>Buy on</TableHead>
            <TableHead>Sell on</TableHead>
            <TableHead className="text-right">Price Diff</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">ROI</TableHead>
            <TableHead className="text-center">Network</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <React.Fragment key={opportunity.id}>
              <TableRow className="cursor-pointer" onClick={() => toggleDetailRow(opportunity.id)}>
                <TableCell className="font-medium">
                  {`${baseToken || opportunity.token}/${quoteToken || 'USD'}`}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {opportunity.buyDex}
                    <Badge variant="outline" className="ml-2">
                      ${opportunity.buyPrice.toFixed(2)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {opportunity.sellDex}
                    <Badge variant="outline" className="ml-2">
                      ${opportunity.sellPrice.toFixed(2)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={opportunity.estimatedProfitPercentage > 0 ? "success" : "destructive"}>
                    {((opportunity.sellPrice - opportunity.buyPrice) / opportunity.buyPrice * 100).toFixed(2)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(opportunity.estimatedProfit)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={opportunity.estimatedProfitPercentage > 0 ? "success" : "destructive"}>
                    {formatPercentage(opportunity.estimatedProfitPercentage)}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${getNetworkBadgeStyle(opportunity.network)} text-white border-none`}>
                    {opportunity.network}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDetailRow(opportunity.id);
                      }}
                    >
                      {openDetailRows[opportunity.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExecuteClick(opportunity);
                      }}
                      disabled={executing === opportunity.id}
                      size="sm"
                    >
                      {executing === opportunity.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={8} className="p-0 border-b-0">
                  <Collapsible open={openDetailRows[opportunity.id]} className="w-full">
                    <CollapsibleContent>
                      <Card className="mt-2 mb-4 mx-2 bg-muted/50">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Price Details</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Buy Price:</div>
                                <div>${opportunity.buyPrice.toFixed(4)}</div>
                                <div className="text-muted-foreground">Sell Price:</div>
                                <div>${opportunity.sellPrice.toFixed(4)}</div>
                                <div className="text-muted-foreground">Price Difference:</div>
                                <div>{((opportunity.sellPrice - opportunity.buyPrice) / opportunity.buyPrice * 100).toFixed(2)}%</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Cost Breakdown</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Investment:</div>
                                <div>{formatCurrency(investmentAmount)}</div>
                                <div className="text-muted-foreground">Trading Fees:</div>
                                <div>{formatCurrency(opportunity.tradingFees)}</div>
                                <div className="text-muted-foreground">Gas Fee:</div>
                                <div>{formatCurrency(opportunity.gasFee)}</div>
                                <div className="text-muted-foreground">Platform Fee:</div>
                                <div>{formatCurrency(opportunity.platformFee)}</div>
                                <div className="text-muted-foreground font-medium">Total Cost:</div>
                                <div className="font-medium">{formatCurrency(investmentAmount + opportunity.tradingFees + opportunity.gasFee + opportunity.platformFee)}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Profit Details</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Gross Profit:</div>
                                <div>{formatCurrency(opportunity.estimatedProfit + opportunity.tradingFees + opportunity.gasFee + opportunity.platformFee)}</div>
                                <div className="text-muted-foreground">Total Fees:</div>
                                <div>{formatCurrency(opportunity.tradingFees + opportunity.gasFee + opportunity.platformFee)}</div>
                                <div className="text-muted-foreground font-medium">Net Profit:</div>
                                <div className="font-medium">{formatCurrency(opportunity.estimatedProfit)}</div>
                                <div className="text-muted-foreground">ROI:</div>
                                <div>{formatPercentage(opportunity.estimatedProfitPercentage)}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Liquidity</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="text-muted-foreground">Buy Liquidity:</div>
                                <div className="flex items-center">
                                  {formatLiquidity(opportunity.liquidity)}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Available liquidity on the buy DEX</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-muted-foreground">Sell Liquidity:</div>
                                <div className="flex items-center">
                                  {formatLiquidity(opportunity.liquidity)}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Available liquidity on the sell DEX</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="text-muted-foreground">Trade Impact:</div>
                                <div>
                                  {opportunity.liquidity && opportunity.liquidity > 0
                                    ? `${((investmentAmount / opportunity.liquidity) * 100).toFixed(2)}%`
                                    : 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OpportunityTable;
