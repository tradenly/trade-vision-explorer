
import React, { useState } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSafeTokenValue } from '@/services/tokenDataService';

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onSelectToken: (token: TokenInfo) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const TokenSelectorNew: React.FC<TokenSelectorProps> = ({
  tokens,
  selectedToken,
  onSelectToken,
  placeholder = "Select a token",
  disabled = false,
  loading = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter tokens based on search input
  const filteredTokens = searchQuery
    ? tokens.filter(token => 
        token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : tokens;
  
  const handleTokenSelect = (token: TokenInfo) => {
    onSelectToken(token);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
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
        <div className="bg-popover border rounded-md shadow-md">
          <Command>
            <CommandInput 
              placeholder="Search tokens..."
              onValueChange={setSearchQuery}
              className="border-none focus:ring-0"
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
              <CommandGroup heading={searchQuery ? "Search Results" : "Available Tokens"}>
                <ScrollArea className="h-[300px]">
                  {loading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Loading tokens...</span>
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
                            <span className="ml-2 text-sm text-muted-foreground truncate">
                              {token.name}
                            </span>
                          </div>
                          {selectedToken?.symbol === token.symbol && (
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
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TokenSelectorNew;
