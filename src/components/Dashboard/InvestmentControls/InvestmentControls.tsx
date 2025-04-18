
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCcw } from 'lucide-react';

interface InvestmentControlsProps {
  investmentAmount: number;
  onInvestmentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
  loading: boolean;
}

const InvestmentControls: React.FC<InvestmentControlsProps> = ({
  investmentAmount,
  onInvestmentChange,
  onRefresh,
  loading
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Investment: $</span>
        <Input
          type="number"
          value={investmentAmount}
          onChange={onInvestmentChange}
          className="w-24"
        />
      </div>
      <Button 
        variant="outline" 
        size="icon" 
        onClick={onRefresh}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default InvestmentControls;
