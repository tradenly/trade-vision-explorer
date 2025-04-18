
import React, { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenInfo } from '@/services/tokenListService';

interface TokenSelectorProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onSelectToken: (token: TokenInfo) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}

const TokenSelectorNew: React.FC<TokenSelectorProps> = ({
  tokens,
  selectedToken,
  onSelectToken,
  placeholder = "Select token",
  loading = false,
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery || !tokens || tokens.length === 0) return tokens || [];
    
    const lowerQuery = searchQuery.toLowerCase();
    return tokens.filter(token => 
      token.name?.toLowerCase().includes(lowerQuery) || 
      token.symbol?.toLowerCase().includes(lowerQuery) ||
      token.address?.toLowerCase().includes(lowerQuery)
    );
  }, [tokens, searchQuery]);

  // Reset search query when popover closes
  useEffect(() => {
    if (!open) setSearchQuery('');
  }, [open]);

  const handleTokenSelect = (token: TokenInfo) => {
    if (token) {
      onSelectToken(token);
      setOpen(false);
    }
  };

  // Format token display value
  const getTokenDisplayValue = (token: TokenInfo | null) => {
    if (!token) return placeholder;
    return token.symbol || placeholder;
  };

  // Generate a unique value for each token
  const getTokenValue = (token: TokenInfo) => {
    return `${token.symbol || ''}-${token.address || ''}-${token.chainId || ''}`;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 p-2 bg-secondary rounded-md">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  // Safeguard against empty token list
  const safeTokens = filteredTokens || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !safeTokens.length}
          className={cn(
            "justify-between w-full font-normal",
            !selectedToken && "text-muted-foreground"
          )}
        >
          {selectedToken ? (
            <div className="flex items-center gap-2">
              {selectedToken.logoURI ? (
                <img 
                  src={selectedToken.logoURI} 
                  alt={selectedToken.symbol} 
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                  {selectedToken.symbol?.charAt(0)}
                </div>
              )}
              <span>{getTokenDisplayValue(selectedToken)}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="start">
        <Command>
          <CommandInput 
            placeholder="Search tokens..." 
            onValueChange={setSearchQuery}
            value={searchQuery}
          />
          <CommandGroup className="max-h-[300px] overflow-auto">
            {safeTokens.length === 0 ? (
              <CommandEmpty>No tokens found</CommandEmpty>
            ) : (
              safeTokens.map((token, index) => {
                // Skip any invalid tokens
                if (!token || !token.symbol) {
                  return null;
                }
                
                // Generate a unique key
                const key = `${token.symbol}-${index}-${token.address || ''}`;
                
                return (
                  <CommandItem
                    key={key}
                    value={getTokenValue(token)}
                    onSelect={() => handleTokenSelect(token)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {token.logoURI ? (
                        <img 
                          src={token.logoURI} 
                          alt={token.symbol} 
                          className="w-5 h-5 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                          {token.symbol.charAt(0)}
                        </div>
                      )}
                      <span>{token.symbol}</span>
                      <span className="text-muted-foreground text-xs ml-auto truncate">
                        {token.name}
                      </span>
                    </div>
                    {selectedToken?.address === token.address && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                );
              })
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default TokenSelectorNew;
