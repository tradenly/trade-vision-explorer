
import React, { useState, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TokenSelectorNewProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onSelectToken: (token: TokenInfo) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const TokenSelectorNew: React.FC<TokenSelectorNewProps> = ({
  tokens,
  selectedToken,
  onSelectToken,
  placeholder = 'Select a token',
  disabled = false,
  loading = false
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTokens = useCallback(() => {
    if (!search) {
      return tokens.slice(0, 50);
    }

    const searchLower = search.toLowerCase();
    return tokens
      .filter(token => 
        token && ((token.symbol && token.symbol.toLowerCase().includes(searchLower)) ||
        (token.name && token.name.toLowerCase().includes(searchLower)))
      )
      .slice(0, 50);
  }, [tokens, search]);

  const handleSelect = (tokenAddress: string) => {
    const token = tokens.find(t => t.address === tokenAddress);
    if (token) {
      onSelectToken(token);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            "bg-background hover:bg-accent hover:text-accent-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled || loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : selectedToken ? (
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
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tokens..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex flex-col items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin mb-2" />
                  <p>Loading tokens...</p>
                </div>
              ) : (
                <p className="text-center p-4 text-sm">No tokens found.</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-[300px]">
                {filteredTokens().map((token) => (
                  <CommandItem
                    key={token.address}
                    value={token.address}
                    onSelect={handleSelect}
                    className="flex items-center gap-2"
                  >
                    {token.logoURI && (
                      <img
                        src={token.logoURI}
                        alt={token.name}
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-xs text-muted-foreground">{token.name}</span>
                      </div>
                      {selectedToken?.address === token.address && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TokenSelectorNew;
