
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { ArbitrageOpportunity } from '@/services/dexService';
import { Loader2 } from 'lucide-react';

interface OpportunitiesTableProps {
  opportunities: ArbitrageOpportunity[];
  onSelectOpportunity: (opportunity: ArbitrageOpportunity) => void;
}

const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  onSelectOpportunity,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pair</TableHead>
          <TableHead>Network</TableHead>
          <TableHead>Buy DEX</TableHead>
          <TableHead>Sell DEX</TableHead>
          <TableHead>Price Diff</TableHead>
          <TableHead>Est. Profit</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {opportunities.map((opportunity) => (
          <TableRow key={opportunity.id}>
            <TableCell>{opportunity.tokenPair}</TableCell>
            <TableCell>
              <Badge variant="outline">{opportunity.network}</Badge>
            </TableCell>
            <TableCell>{opportunity.buyDex}</TableCell>
            <TableCell>{opportunity.sellDex}</TableCell>
            <TableCell className="text-green-600">
              +{opportunity.priceDifferencePercentage.toFixed(2)}%
            </TableCell>
            <TableCell>
              <span className="font-medium text-green-600">
                ${formatNumber(opportunity.netProfit)}
              </span>
              <span className="text-xs text-muted-foreground block">
                ({opportunity.netProfitPercentage.toFixed(2)}%)
              </span>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                onClick={() => onSelectOpportunity(opportunity)}
              >
                Execute
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OpportunitiesTable;
