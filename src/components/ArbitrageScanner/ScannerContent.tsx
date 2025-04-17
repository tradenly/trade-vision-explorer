
import React from 'react';
import { CardContent } from '@/components/ui/card';
import TokenPairSelector from '@/components/TokenSelector/TokenPairSelector';
import { ScanControls } from './ScanControls';
import { OpportunityTabs } from './OpportunityTabs';
import { TokenInfo } from '@/services/tokenListService';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { ArbitrageOpportunity } from '@/services/dexService';
import { ChainId } from '@/services/tokenListService';

interface ScannerContentProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  loading: boolean;
  error: string | null;
  opportunities: ArbitrageOpportunity[];
  lastScanTime: Date | null;
  selectedChain: ChainId;
  investmentAmount: number;
  onTokenPairSelect: (base: TokenInfo, quote: TokenInfo) => void;
  onChainChange: (chainId: ChainId) => void;
  onInvestmentAmountChange: (amount: number) => void;
  onScan: () => void;
  onOpportunitySelect: (opportunity: ArbitrageOpportunity) => void;
}

export const ScannerContent: React.FC<ScannerContentProps> = ({
  baseToken,
  quoteToken,
  loading,
  error,
  opportunities,
  lastScanTime,
  selectedChain,
  investmentAmount,
  onTokenPairSelect,
  onChainChange,
  onInvestmentAmountChange,
  onScan,
  onOpportunitySelect,
}) => {
  return (
    <CardContent>
      <div className="space-y-6">
        <TokenPairSelector 
          onSelectTokenPair={onTokenPairSelect}
          selectedChain={selectedChain}
          onSelectChain={onChainChange}
          investmentAmount={investmentAmount}
          onInvestmentAmountChange={onInvestmentAmountChange}
        />

        <ScanControls 
          loading={loading}
          onScan={onScan}
          lastScanTime={lastScanTime}
          disabled={!baseToken || !quoteToken}
        />

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        <OpportunityTabs 
          opportunities={opportunities} 
          onSelect={onOpportunitySelect}
        />
      </div>
    </CardContent>
  );
};
