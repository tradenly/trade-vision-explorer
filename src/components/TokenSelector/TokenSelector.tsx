
import React, { useEffect, useState, useCallback } from 'react';
import { ChainId, CHAIN_NAMES, TokenInfo } from '@/services/tokenListService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import debounce from 'lodash.debounce';
import { useTokens } from '@/hooks/useTokens';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TokenSelectorProps {
  onSelectToken?: (token: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  placeholder?: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  onSelectToken, 
  selectedChain = ChainId.ETHEREUM,
  onSelectChain,
  placeholder = "Select a token"
}) => {
  const { 
    loading, 
    error, 
    popularTokens, 
    handleChainChange: hookHandleChainChange,
    getChainTokens,
    getSafeTokenValue,
    getStableTokenId
  } = useTokens(selectedChain);
  
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);

  // Handler for chain selection
  const handleChainChange = (value: string) => {
    const chainId = parseInt(value) as ChainId;
    if (onSelectChain) {
      onSelectChain(chainId);
    }
    hookHandleChainChange(chainId);
    setSelectedToken(null);
  };

  // Debounced search filter
  const debouncedSetSearch = useCallback(
    debounce((value: string) => setSearch(value), 300),
    []
  );

  // Filter tokens based on search input
  const filteredTokens = getChainTokens().filter(token => 
    token.name.toLowerCase().includes(search.toLowerCase()) || 
    token.symbol.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

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
                placeholder
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
                  ) : error ? (
                    <div className="flex items-center justify-center p-4 text-red-500">
                      <span>Error loading tokens</span>
                    </div>
                  ) : (
                    "No tokens found"
                  )}
                </CommandEmpty>
                
                {!search && popularTokens[selectedChain]?.length > 0 && (
                  <CommandGroup heading="Popular Tokens">
                    <ScrollArea className="h-[200px]">
                      {popularTokens[selectedChain].map((token) => {
                        // Generate stable ID for the token
                        const tokenId = getStableTokenId(token);
                        const tokenValue = getSafeTokenValue(token);
                        
                        // Skip tokens with empty values
                        if (!tokenValue) return null;
                        
                        return (
                          <CommandItem
                            key={`popular-${tokenId}`}
                            value={`popular-${token.symbol}-${tokenId}`}
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
                        );
                      })}
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
                      filteredTokens.map((token) => {
                        // Generate stable ID for the token
                        const tokenId = getStableTokenId(token);
                        const tokenValue = getSafeTokenValue(token);
                        
                        // Skip tokens with empty values
                        if (!tokenValue) return null;
                        
                        return (
                          <CommandItem
                            key={`token-${tokenId}`}
                            value={`${token.symbol}-${tokenId}`}
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
                        );
                      })
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
