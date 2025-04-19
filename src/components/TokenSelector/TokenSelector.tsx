
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
import { toast } from '@/hooks/use-toast';

interface TokenSelectorProps {
  onSelectToken?: (token: TokenInfo) => void;
  selectedChain?: ChainId;
  onSelectChain?: (chainId: ChainId) => void;
  placeholder?: string;
  selectedToken?: TokenInfo | null;
  disabled?: boolean;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ 
  onSelectToken,
  selectedChain = ChainId.ETHEREUM,
  onSelectChain,
  placeholder = "Select a token",
  selectedToken = null,
  disabled = false
}) => {
  const { 
    loading, 
    error, 
    popularTokens, 
    handleChainChange: hookHandleChainChange,
    getChainTokens,
    getSafeTokenValue,
    findTokenByValue,
    ensureValidAddress
  } = useTokens(selectedChain);
  
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [internalSelectedToken, setInternalSelectedToken] = useState<TokenInfo | null>(selectedToken);

  // Update internal state when prop changes
  useEffect(() => {
    setInternalSelectedToken(selectedToken);
  }, [selectedToken]);

  // Handler for chain selection
  const handleChainChange = (value: string) => {
    try {
      const chainId = parseInt(value) as ChainId;
      if (onSelectChain) {
        onSelectChain(chainId);
      }
      hookHandleChainChange(chainId);
      setInternalSelectedToken(null);
    } catch (error) {
      console.error("Error changing chain:", error);
      toast({
        title: "Error",
        description: "Failed to change blockchain",
        variant: "destructive"
      });
    }
  };

  // Debounced search filter
  const debouncedSetSearch = useCallback(
    debounce((value: string) => setSearch(value), 300),
    []
  );

  // Filter tokens based on search input
  const getFilteredTokens = useCallback(() => {
    try {
      const tokens = getChainTokens();
      
      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return []; // Return empty array if no tokens
      }
      
      // Validate tokens before filtering
      const validatedTokens = tokens
        .filter(token => token && token.symbol && token.name)
        .map(ensureValidAddress);
      
      if (!search) {
        return validatedTokens.slice(0, 50); // Limit results if no search
      }
      
      return validatedTokens
        .filter(token => 
          token.name?.toLowerCase().includes(search.toLowerCase()) || 
          token.symbol?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 50);
    } catch (error) {
      console.error("Error filtering tokens:", error);
      return [];
    }
  }, [getChainTokens, search, ensureValidAddress]);

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    try {
      if (!token) return;
      
      // Ensure the token has a valid address
      const validToken = ensureValidAddress(token);
      
      setInternalSelectedToken(validToken);
      if (onSelectToken) {
        onSelectToken(validToken);
      }
      setOpen(false);
    } catch (error) {
      console.error("Error selecting token:", error);
      toast({
        title: "Error",
        description: "Failed to select token. Please try again.",
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

  // Get current filtered tokens
  const filteredTokens = getFilteredTokens();

  // Get current popular tokens for selected chain
  const currentPopularTokens = popularTokens[selectedChain] || [];

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
          disabled={disabled}
        >
          <SelectTrigger className="w-full bg-background">
            <div className="flex items-center gap-2">
              {selectedChain && (
                <img 
                  src={chainLogos[selectedChain]} 
                  alt={CHAIN_NAMES[selectedChain]} 
                  className="w-5 h-5 rounded-full" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <SelectValue placeholder={CHAIN_NAMES[selectedChain] || "Select Chain"} />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectGroup>
              {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <img 
                      src={chainLogos[Number(id)]} 
                      alt={String(name)} 
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
          <PopoverTrigger>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-background"
              disabled={loading || disabled}
            >
              {internalSelectedToken ? (
                <div className="flex items-center">
                  {internalSelectedToken.logoURI && (
                    <img
                      src={internalSelectedToken.logoURI}
                      alt={internalSelectedToken.name}
                      className="w-5 h-5 mr-2 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span>{internalSelectedToken.symbol}</span>
                </div>
              ) : (
                placeholder
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px] max-h-[500px] bg-background" align="start">
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
                
                {!search && currentPopularTokens.length > 0 && (
                  <CommandGroup heading="Popular Tokens">
                    <ScrollArea>
                      {currentPopularTokens.map((token, index) => {
                        // Ensure we have a valid token with a symbol
                        if (!token || !token.symbol) return null;
                        
                        // Generate a unique key
                        const key = `popular-${token.symbol}-${index}-${token.address || ''}`;
                        
                        return (
                          <CommandItem
                            key={key}
                            value={key}
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
                            {internalSelectedToken?.symbol === token.symbol && (
                              <Check className="h-4 w-4 ml-auto" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </ScrollArea>
                  </CommandGroup>
                )}
                
                <CommandGroup heading={search ? "Search Results" : "All Tokens"}>
                  <ScrollArea>
                    {loading && search ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span>Searching...</span>
                      </div>
                    ) : (
                      filteredTokens.map((token, index) => {
                        // Ensure we have a valid token with a symbol
                        if (!token || !token.symbol) return null;
                        
                        // Generate a unique key
                        const key = `token-${token.symbol}-${index}-${token.address || ''}`;
                        
                        return (
                          <CommandItem
                            key={key}
                            value={key}
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
                            {internalSelectedToken?.symbol === token.symbol && (
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
