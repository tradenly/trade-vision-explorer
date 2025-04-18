
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { executeArbitrageTrade, useWalletForArbitrage } from '@/services/arbitrageExecutionService';
import { toast } from '@/hooks/use-toast';
import { ArbitrageOpportunity } from '@/services/dexService';
import { TransactionStatus } from '@/services/dex/types';
import OpportunityDetailsDialog from './OpportunityDetails/OpportunityDetailsDialog';
import OpportunitiesTable from './OpportunitiesTable/OpportunitiesTable';
import InvestmentControls from './InvestmentControls/InvestmentControls';

interface ArbitrageOpportunitiesProps {
  opportunities: ArbitrageOpportunity[];
  loading: boolean;
  error: string | null;
  investmentAmount: number;
  onRefresh?: () => void;
  onInvestmentAmountChange?: (amount: number) => void;
}

const ArbitrageOpportunities: React.FC<ArbitrageOpportunitiesProps> = ({
  opportunities,
  loading,
  error,
  investmentAmount,
  onRefresh,
  onInvestmentAmountChange
}) => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [executionProgress, setExecutionProgress] = useState(0);
  
  const { address: walletAddress, isConnected } = useWalletForArbitrage(
    selectedOpportunity?.network || 'ethereum'
  );

  const handleExecuteTrade = async () => {
    if (!selectedOpportunity || !isConnected || !walletAddress) {
      toast({
        title: "Cannot execute trade",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setExecuting(true);
    setTransactionStatus(TransactionStatus.PENDING);
    
    const progressInterval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 500);

    try {
      const result = await executeArbitrageTrade(
        selectedOpportunity,
        walletAddress,
        investmentAmount
      );
      
      setTransactionStatus(result.status);
      
      if (result.status === TransactionStatus.SUCCESS) {
        setExecutionProgress(100);
        toast({
          title: "Trade executed successfully",
          description: `Profit: $${selectedOpportunity.netProfit.toFixed(2)}`,
        });
        
        if (onRefresh) {
          setTimeout(onRefresh, 2000);
        }
      } else {
        toast({
          title: "Trade execution failed",
          description: result.error || "An error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      setTransactionStatus(TransactionStatus.ERROR);
      toast({
        title: "Error executing trade",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setExecuting(false);
        if (transactionStatus === TransactionStatus.SUCCESS) {
          setExecuteDialogOpen(false);
        }
      }, 2000);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    if (!isNaN(amount) && amount > 0 && onInvestmentAmountChange) {
      onInvestmentAmountChange(amount);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Arbitrage Opportunities</CardTitle>
        <InvestmentControls
          investmentAmount={investmentAmount}
          onInvestmentChange={handleAmountChange}
          onRefresh={onRefresh}
          loading={loading}
        />
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : opportunities.length > 0 ? (
          <OpportunitiesTable
            opportunities={opportunities}
            onSelectOpportunity={(opportunity) => {
              setSelectedOpportunity(opportunity);
              setExecuteDialogOpen(true);
            }}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No arbitrage opportunities found at the moment.</p>
            <p className="text-sm">Try adjusting your investment amount or check back later.</p>
          </div>
        )}

        <OpportunityDetailsDialog
          open={executeDialogOpen}
          onOpenChange={setExecuteDialogOpen}
          opportunity={selectedOpportunity}
          executing={executing}
          transactionStatus={transactionStatus}
          executionProgress={executionProgress}
          onExecute={handleExecuteTrade}
          walletAddress={walletAddress}
          isConnected={isConnected}
          investmentAmount={investmentAmount}
        />
      </CardContent>
    </Card>
  );
};

export default ArbitrageOpportunities;
