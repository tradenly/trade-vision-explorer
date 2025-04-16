
import React, { useEffect, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChainId, CHAIN_NAMES, TokenInfo, fetchAllTokens } from '@/services/tokenListService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import debounce from 'lodash.debounce';
import { useToast } from '@/hooks/use-toast';

interface TokenSelectorProps {
  onSelectToken?: (token: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  onSelectToken, 
  selectedChain = ChainId.ETHEREUM,
  onSelectChain
}) => {
  const [tokens, setTokens] = useState<Record<number, TokenInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [popularTokens, setPopularTokens] = useState<Record<number, TokenInfo[]>>({});
  const { toast } = useToast();

  // Load tokens on component mount
  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      try {
        const allTokens = await fetchAllTokens();
        
        // Create a set of popular tokens per chain
        const popular: Record<number, TokenInfo[]> = {};
        
        // Ethereum popular tokens
        popular[ChainId.ETHEREUM] = allTokens[ChainId.ETHEREUM]
          ?.filter(token => ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        // BNB Chain popular tokens
        popular[ChainId.BNB] = allTokens[ChainId.BNB]
          ?.filter(token => ['BNB', 'WBNB', 'CAKE', 'BUSD', 'USDT', 'ETH', 'BTCB', 'DOT', 'ADA', 'XRP'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        // Solana popular tokens
        popular[ChainId.SOLANA] = allTokens[ChainId.SOLANA]
          ?.filter(token => ['SOL', 'USDC', 'USDT', 'BTC', 'ETH', 'BONK', 'JUP', 'RAY', 'ORCA', 'MNGO'].includes(token.symbol))
          ?.slice(0, 10) || [];
        
        setTokens(allTokens);
        setPopularTokens(popular);
      } catch (error) {
        console.error('Error loading tokens:', error);
        toast({
          title: "Failed to load tokens",
          description: "Could not fetch token list. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    loadTokens();
  }, [toast]);

  // Handler for chain selection
  const handleChainChange = (value: string) => {
    const chainId = parseInt(value) as ChainId;
    if (onSelectChain) {
      onSelectChain(chainId);
    }
    setSelectedToken(null);
  };

  // Debounced search filter
  const debouncedSetSearch = useCallback(
    debounce((value: string) => setSearch(value), 300),
    []
  );

  // Filter tokens based on search input
  const filteredTokens = tokens[selectedChain]?.filter(token => 
    token.name.toLowerCase().includes(search.toLowerCase()) || 
    token.symbol.toLowerCase().includes(search.toLowerCase())
  )?.slice(0, 50) || [];

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    if (onSelectToken) {
      onSelectToken(token);
    }
    setOpen(false);
  };

  // Chain logo mapping
  const chainLogos: Record<number, string> = {
    [ChainId.ETHEREUM]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//ethereum-icon.png',
    [ChainId.BNB]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//bnb-icon.png',
    [ChainId.SOLANA]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//solana-icon.png',
  };

  return (
    <div className="space-y-4">
      {/* Chain Selector */}
      <div>
        <label htmlFor="chain-select" className="block text-sm font-medium mb-1">
          Select Chain
        </label>
        <Select 
          value={selectedChain.toString()} 
          onValueChange={handleChainChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a chain">
              {selectedChain && (
                <div className="flex items-center gap-2">
                  <img 
                    src={chainLogos[selectedChain]} 
                    alt={CHAIN_NAMES[selectedChain]} 
                    className="w-5 h-5 rounded-full" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span>{CHAIN_NAMES[selectedChain]}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Supported Chains</SelectLabel>
              {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <img 
                      src={chainLogos[Number(id)]} 
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

      {/* Token Selector with Search */}
      <div>
        <label htmlFor="token-select" className="block text-sm font-medium mb-1">
          Select Token
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-background"
              disabled={loading}
            >
              {selectedToken ? (
                <div className="flex items-center">
                  {selectedToken.logoURI && (
                    <img
                      src={selectedToken.logoURI}
                      alt={selectedToken.name}
                      className="w-5 h-5 mr-2 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : (
                "Select a token"
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px] max-h-[500px]" align="start">
            <Command className="rounded-lg border shadow-md">
              <CommandInput 
                placeholder="Search tokens..." 
                onValueChange={debouncedSetSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Loading tokens...</span>
                    </div>
                  ) : (
                    "No tokens found"
                  )}
                </CommandEmpty>
                
                {!search && popularTokens[selectedChain]?.length > 0 && (
                  <CommandGroup heading="Popular Tokens">
                    <ScrollArea className="h-[200px]">
                      {popularTokens[selectedChain].map((token) => (
                        <CommandItem
                          key={`popular-${token.address}`}
                          value={`popular-${token.symbol}-${token.address}`}
                          onSelect={() => handleTokenSelect(token)}
                          className="flex items-center"
                        >
                          <div className="flex items-center flex-1">
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
                            <span className="font-medium">{token.symbol}</span>
                            <span className="ml-2 text-sm text-gray-500 truncate">
                              {token.name}
                            </span>
                          </div>
                          {selectedToken?.address === token.address && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                )}
                
                <CommandGroup heading={search ? "Search Results" : "All Tokens"}>
                  <ScrollArea className="h-[300px]">
                    {loading && search ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      filteredTokens.map((token) => (
                        <CommandItem
                          key={token.address}
                          value={`${token.symbol}-${token.address}`}
                          onSelect={() => handleTokenSelect(token)}
                          className="flex items-center"
                        >
                          <div className="flex items-center flex-1">
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
                            <span className="font-medium">{token.symbol}</span>
                            <span className="ml-2 text-sm text-gray-500 truncate">
                              {token.name}
                            </span>
                          </div>
                          {selectedToken?.address === token.address && (
                            <Check className="h-4 w-4 ml-auto" />
                          )}
                        </CommandItem>
                      ))
                    )}
                  </ScrollArea>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TokenSelector;
