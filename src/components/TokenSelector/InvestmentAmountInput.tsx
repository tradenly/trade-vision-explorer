
import React from 'react';
import { Input } from '@/components/ui/input';

interface InvestmentAmountInputProps {
  amount: number;
  onChange: (amount: number) => void;
}

const InvestmentAmountInput: React.FC<InvestmentAmountInputProps> = ({ amount, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value > 0) {
        onChange(value);
      }
    } catch (error) {
      console.error('Error changing investment amount:', error);
    }
  };
  
  return (
    <div className="space-y-1 mt-4">
      <label htmlFor="investment-amount" className="text-sm font-medium">Investment Amount (USD)</label>
      <div className="flex items-center">
        <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md">$</span>
        <Input
          id="investment-amount"
          type="number"
          min="1"
          value={amount}
          onChange={handleChange}
          className="rounded-l-none"
        />
      </div>
      <p className="text-xs text-muted-foreground">Enter the amount you want to invest in this arbitrage opportunity</p>
    </div>
  );
};

export default InvestmentAmountInput;
