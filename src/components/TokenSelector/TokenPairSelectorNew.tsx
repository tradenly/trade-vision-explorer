
import React, { useState, useEffect } from 'react';
import { ChainId, CHAIN_NAMES, TokenInfo } from '@/services/tokenListService';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTokensSimple } from '@/hooks/useTokensSimple';
import { TokenSelectorNew } from './TokenSelectorNew';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TokenPairSelectorProps {
  onSelectTokenPair: (baseToken: TokenInfo, quoteToken: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  investmentAmount?: number;
  onInvestmentAmountChange?: (amount: number) => void;
}

const TokenPairSelectorNew: React.FC<TokenPairSelectorProps> = ({ 
  onSelectTokenPair, 
  selectedChain = ChainId.ETHEREUM,
  onSelectChain,
  investmentAmount = 1000,
  onInvestmentAmountChange
}) => {
  const { toast } = useToast();
  
  const {
    loading,
    error,
    selectedChain: hookSelectedChain,
    allChainTokens,
    quoteTokens,
    popularTokens,
    handleChainChange: hookHandleChainChange,
    ensureValidAddress,
  } = useTokensSimple(selectedChain);
  
  const [baseToken, setBaseToken] = useState<TokenInfo | null>(null);
  const [quoteToken, setQuoteToken] = useState<TokenInfo | null>(null);
  
  // Handle chain selection change
  const handleChainChange = (chainId: ChainId) => {
    try {
      hookHandleChainChange(chainId);
      if (onSelectChain) {
        onSelectChain(chainId);
      }
      // Reset token selections when chain changes
      setBaseToken(null);
      setQuoteToken(null);
    } catch (error) {
      console.error('Error changing chain:', error);
      toast({
        title: "Error",
        description: "Failed to change blockchain",
        variant: "destructive"
      });
    }
  };
  
  // When both tokens are selected, notify the parent
  useEffect(() => {
    if (baseToken && quoteToken) {
      try {
        onSelectTokenPair(baseToken, quoteToken);
      } catch (error) {
        console.error('Error in onSelectTokenPair:', error);
        toast({
          title: "Error",
          description: "Failed to select token pair",
          variant: "destructive"
        });
      }
    }
  }, [baseToken, quoteToken, onSelectTokenPair, toast]);
  
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
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
    }
  };
  
  // Chain logo mapping
  const chainLogos: Record<number, string> = {
    [ChainId.ETHEREUM]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//ethereum-icon.png',
    [ChainId.BNB]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//bnb-icon.png',
    [ChainId.SOLANA]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//solana-icon.png',
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
            value={hookSelectedChain.toString()} 
            onValueChange={(value) => handleChainChange(parseInt(value) as ChainId)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Select Blockchain">
                {CHAIN_NAMES[hookSelectedChain]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background z-[100]">
              <SelectGroup>
                {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <img 
                        src={chainLogos[Number(id)] || `https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//${name.toLowerCase().replace(' ', '-')}-icon.png`}
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
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Using fallback token list.
            </AlertDescription>
          </Alert>
        )}

        {/* Token Pair Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-1">
            <label className="text-sm font-medium">Base Token (From)</label>
            <TokenSelectorNew
              tokens={popularTokens.length ? popularTokens : allChainTokens}
              selectedToken={baseToken}
              onSelectToken={handleBaseTokenSelect}
              placeholder="Select Base Token"
              disabled={loading}
              loading={loading}
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
            <TokenSelectorNew
              tokens={quoteTokens.length ? quoteTokens : popularTokens}
              selectedToken={quoteToken}
              onSelectToken={handleQuoteTokenSelect}
              placeholder="Select Quote Token"
              disabled={loading}
              loading={loading}
            />
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

export default TokenPairSelectorNew;
