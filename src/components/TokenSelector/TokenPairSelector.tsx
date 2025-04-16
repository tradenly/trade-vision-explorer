
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
  const { 
    loading, 
    getQuoteTokens, 
    handleChainChange: hookHandleChainChange, 
    getSafeTokenValue,
    findTokenByValue,
    ensureValidAddress
  } = useTokens(selectedChain);
  
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  const [quoteTokens, setQuoteTokens] = useState<TokenInfo[]>([]);
  const { toast } = useToast();
  
  // Load quote tokens when chain changes
  useEffect(() => {
    try {
      const tokens = getQuoteTokens();
      console.log('Quote tokens loaded:', tokens.length);
      setQuoteTokens(tokens);
      
      // Reset selections when chain changes
      setBaseToken(null);
      setQuoteToken(null);
    } catch (error) {
      console.error('Error loading quote tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load quote tokens",
        variant: "destructive"
      });
      setQuoteTokens([]);
    }
  }, [selectedChain, getQuoteTokens, toast]);

  // When both tokens are selected, notify the parent
  useEffect(() => {
    if (baseToken && quoteToken) {
      try {
        onSelectTokenPair(baseToken, quoteToken);
      } catch (error) {
        console.error('Error in onSelectTokenPair:', error);
      }
    }
  }, [baseToken, quoteToken, onSelectTokenPair]);

  // Handle chain change
  const handleChainChange = (chainId: ChainId) => {
    try {
      hookHandleChainChange(chainId);
      if (onSelectChain) {
        onSelectChain(chainId);
      }
    } catch (error) {
      console.error('Error changing chain:', error);
      toast({
        title: "Error",
        description: "Failed to change blockchain",
        variant: "destructive"
      });
    }
  };

  // Handle base token selection
  const handleBaseTokenSelect = (token: TokenInfo) => {
    if (!token) return;
    try {
      const validToken = ensureValidAddress(token);
      setBaseToken(validToken);
    } catch (error) {
      console.error('Error selecting base token:', error);
      toast({
        title: "Error",
        description: "Failed to select token",
        variant: "destructive"
      });
    }
  };

  // Handle quote token selection
  const handleQuoteTokenSelect = (token: TokenInfo) => {
    if (!token) return;
    try {
      const validToken = ensureValidAddress(token);
      setQuoteToken(validToken);
    } catch (error) {
      console.error('Error selecting quote token:', error);
      toast({
        title: "Error",
        description: "Failed to select token",
        variant: "destructive"
      });
    }
  };

  const handleSwapTokens = () => {
    if (baseToken && quoteToken) {
      try {
        const temp = baseToken;
        setBaseToken(quoteToken);
        setQuoteToken(temp);
      } catch (error) {
        console.error('Error swapping tokens:', error);
        toast({
          title: "Error",
          description: "Failed to swap tokens",
          variant: "destructive"
        });
      }
    }
  };

  const handleInvestmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const amount = parseFloat(e.target.value);
      if (!isNaN(amount) && amount > 0) {
        if (onInvestmentAmountChange) {
          onInvestmentAmountChange(amount);
        }
      }
    } catch (error) {
      console.error('Error changing investment amount:', error);
    }
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
              <SelectValue placeholder="Select Blockchain">
                {CHAIN_NAMES[selectedChain]}
              </SelectValue>
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
              selectedToken={baseToken}
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
            {quoteTokens.length > 0 ? (
              <Select
                value={quoteToken ? getSafeTokenValue(quoteToken) : ""}
                onValueChange={(value) => {
                  if (!value) return;
                  
                  // Find token by value (address)
                  const found = findTokenByValue(value);
                  if (found) {
                    handleQuoteTokenSelect(found);
                  } else {
                    console.warn("Selected token not found:", value);
                    toast({
                      title: "Warning",
                      description: "Selected token not found in current list",
                      variant: "default"
                    });
                  }
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
                    <SelectLabel>Quote Tokens</SelectLabel>
                    {quoteTokens.map((token, index) => {
                      // Skip invalid tokens
                      if (!token || !token.symbol || !token.address) return null;
                      
                      // Use the token's address as a unique, stable value
                      const tokenValue = getSafeTokenValue(token);
                      if (!tokenValue) return null;
                      
                      return (
                        <SelectItem 
                          key={`quote-${token.symbol}-${index}`}
                          value={tokenValue}
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
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex justify-center p-2 border rounded-md bg-muted">
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading quote tokens...</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No quote tokens available</span>
                )}
              </div>
            )}
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
