
import React from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import TokenSelectorNew from './TokenSelectorNew';

interface TokenPairControlsProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  onBaseTokenSelect: (token: TokenInfo) => void;
  onQuoteTokenSelect: (token: TokenInfo) => void;
  onSwapTokens: () => void;
  popularTokens: TokenInfo[];
  quoteTokens: TokenInfo[];
  allChainTokens: TokenInfo[];
  loading: boolean;
}

const TokenPairControls: React.FC<TokenPairControlsProps> = ({
  baseToken,
  quoteToken,
  onBaseTokenSelect,
  onQuoteTokenSelect,
  onSwapTokens,
  popularTokens,
  quoteTokens,
  allChainTokens,
  loading
}) => {
  console.log('TokenPairControls - popularTokens:', popularTokens.length);
  console.log('TokenPairControls - quoteTokens:', quoteTokens.length);
  console.log('TokenPairControls - allChainTokens:', allChainTokens.length);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="space-y-1">
        <label className="text-sm font-medium">Base Token (From)</label>
        <TokenSelectorNew
          tokens={popularTokens.length ? popularTokens : allChainTokens}
          selectedToken={baseToken}
          onSelectToken={onBaseTokenSelect}
          placeholder="Select Base Token"
          disabled={loading}
          loading={loading}
        />
      </div>
      
      <div className="md:flex items-center justify-center hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={onSwapTokens}
          disabled={!baseToken || !quoteToken}
        >
          <ArrowRightLeft />
        </Button>
      </div>
      
      <div className="space-y-1 md:col-start-2 md:row-start-1">
        <label className="text-sm font-medium">Quote Token (To)</label>
        <TokenSelectorNew
          tokens={quoteTokens.length ? quoteTokens : popularTokens}
          selectedToken={quoteToken}
          onSelectToken={onQuoteTokenSelect}
          placeholder="Select Quote Token"
          disabled={loading}
          loading={loading}
        />
      </div>

      <div className="block md:hidden text-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="rounded-full"
          onClick={onSwapTokens}
          disabled={!baseToken || !quoteToken}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Swap Tokens
        </Button>
      </div>
    </div>
  );
};

export default TokenPairControls;
