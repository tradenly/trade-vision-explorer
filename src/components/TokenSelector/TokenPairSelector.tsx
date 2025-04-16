
import React, { useState, useEffect } from 'react';
import { ChainId, CHAIN_NAMES, TokenInfo } from '@/services/tokenListService';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TokenSelector from './TokenSelector';
import { Button } from '../ui/button';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTokens } from '@/hooks/useTokens';

interface TokenPairSelectorProps {
  onSelectTokenPair: (baseToken: TokenInfo, quoteToken: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  investmentAmount?: number;
  onInvestmentAmountChange?: (amount: number) => void;
}

const TokenPairSelector: React.FC<TokenPairSelectorProps> = ({ 
  onSelectTokenPair, 
  selectedChain = ChainId.ETHEREUM,
  onSelectChain,
  investmentAmount = 1000,
  onInvestmentAmountChange
}) => {
  const { loading, getQuoteTokens, handleChainChange: hookHandleChainChange } = useTokens(selectedChain);
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const { toast } = useToast();
  
  // Load quote tokens when chain changes
  useEffect(() => {
    const tokens = getQuoteTokens();
    console.log('Quote tokens loaded:', tokens.length);
    setQuoteTokens(tokens);
    
    // Reset selections when chain changes
    setBaseToken(null);
    setQuoteToken(null);
  }, [selectedChain, getQuoteTokens]);

  // When both tokens are selected, notify the parent
  useEffect(() => {
    if (baseToken && quoteToken) {
      onSelectTokenPair(baseToken, quoteToken);
    }
  }, [baseToken, quoteToken, onSelectTokenPair]);

  // Handle chain change
  const handleChainChange = (chainId: ChainId) => {
    hookHandleChainChange(chainId);
    if (onSelectChain) {
      onSelectChain(chainId);
    }
  };

  // Handle base token selection
  const handleBaseTokenSelect = (token: TokenInfo) => {
    setBaseToken(token);
  };

  // Handle quote token selection
  const handleQuoteTokenSelect = (token: TokenInfo) => {
    setQuoteToken(token);
  };

  const handleSwapTokens = () => {
    if (baseToken && quoteToken) {
      const temp = baseToken;
      setBaseToken(quoteToken);
      setQuoteToken(temp);
    }
  };

  const handleInvestmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value);
    if (!isNaN(amount) && amount > 0) {
      if (onInvestmentAmountChange) {
        onInvestmentAmountChange(amount);
      }
    }
  };

  // Generate safe token value - ensure it's never empty
  const getSafeTokenValue = (token: TokenInfo | null): string => {
    if (!token || !token.address || token.address === '') {
      return `generated-token-${Math.random().toString(36).substring(2, 10)}`;
    }
    return token.address;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">Select Token Pair</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chain Selector */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Blockchain</label>
          <Select 
            value={selectedChain.toString()} 
            onValueChange={(value) => handleChainChange(parseInt(value) as ChainId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Blockchain" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <img 
                        src={`https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//${name.toLowerCase().replace(' ', '-')}-icon.png`}
                        alt={name} 
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {name}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Token Pair Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-1">
            <label className="text-sm font-medium">Base Token (From)</label>
            <TokenSelector
              selectedChain={selectedChain}
              onSelectToken={handleBaseTokenSelect}
              placeholder="Select Base Token"
            />
          </div>
          
          <div className="flex items-center justify-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={handleSwapTokens}
              disabled={!baseToken || !quoteToken}
            >
              <ArrowRightLeft />
            </Button>
          </div>
          
          <div className="space-y-1 md:col-start-2 md:row-start-1">
            <label className="text-sm font-medium">Quote Token (To)</label>
            <Select
              value={quoteToken ? getSafeTokenValue(quoteToken) : undefined}
              onValueChange={(value) => {
                const selected = quoteTokens.find(token => getSafeTokenValue(token) === value);
                if (selected) handleQuoteTokenSelect(selected);
              }}
              disabled={loading || quoteTokens.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Quote Token">
                  {quoteToken && (
                    <div className="flex items-center">
                      {quoteToken.logoURI && (
                        <img 
                          src={quoteToken.logoURI} 
                          alt={quoteToken.name} 
                          className="w-5 h-5 mr-2 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      {quoteToken.symbol}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {loading ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading quote tokens...
                    </div>
                  ) : quoteTokens.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      No quote tokens available
                    </div>
                  ) : (
                    quoteTokens.map((token) => {
                      // Generate safe unique value for each token
                      const safeValue = getSafeTokenValue(token);
                      return (
                        <SelectItem 
                          key={`quote-${safeValue}`} 
                          value={safeValue}
                        >
                          <div className="flex items-center">
                            {token.logoURI && (
                              <img 
                                src={token.logoURI} 
                                alt={token.name} 
                                className="w-5 h-5 mr-2 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            {token.symbol}
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Investment Amount Input */}
        <div className="space-y-1 mt-4">
          <label htmlFor="investment-amount" className="text-sm font-medium">Investment Amount (USD)</label>
          <div className="flex items-center">
            <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md">$</span>
            <Input
              id="investment-amount"
              type="number"
              min="1"
              value={investmentAmount}
              onChange={handleInvestmentAmountChange}
              className="rounded-l-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">Enter the amount you want to invest in this arbitrage opportunity</p>
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full">
          {baseToken && quoteToken ? (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-2 rounded-md text-sm">
              <p>Selected pair: <span className="font-bold">{baseToken.symbol}/{quoteToken.symbol}</span></p>
              <p>Ready to scan for arbitrage opportunities</p>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-2 rounded-md text-sm">
              <p>Please select both base and quote tokens to continue</p>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default TokenPairSelector;
