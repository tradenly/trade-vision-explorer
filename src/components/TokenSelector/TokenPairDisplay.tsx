
import React from 'react';
import { TokenInfo } from '@/services/tokenListService';

interface TokenPairDisplayProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
}

const TokenPairDisplay: React.FC<TokenPairDisplayProps> = ({ baseToken, quoteToken }) => {
  if (!baseToken || !quoteToken) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded-md text-sm">
        <p>Please select both base and quote tokens to continue</p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-2 rounded-md text-sm">
      <p>Selected pair: <span className="font-bold">{baseToken.symbol}/{quoteToken.symbol}</span></p>
      <p>Ready to scan for arbitrage opportunities</p>
    </div>
  );
};

export default TokenPairDisplay;
