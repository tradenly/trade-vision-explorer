
import React, { useState } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';

interface TokenSelectorNewProps {
  tokens: TokenInfo[];
  selectedToken: TokenInfo | null;
  onSelectToken: (token: TokenInfo) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const TokenSelectorNew: React.FC<TokenSelectorNewProps> = ({
  tokens = [],
  selectedToken,
  onSelectToken,
  placeholder = 'Select token',
  disabled = false,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  
  const filteredTokens = React.useMemo(() => {
    if (!searchQuery) return tokens;
    
    const query = searchQuery.toLowerCase();
    return tokens.filter(token => 
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.address?.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);
  
  const handleSelectToken = (token: TokenInfo) => {
    onSelectToken(token);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToken(null as unknown as TokenInfo);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {selectedToken ? (
            <div className="flex items-center gap-2">
              {selectedToken.logoURI && (
                <img
                  src={selectedToken.logoURI}
                  alt={selectedToken.symbol}
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <span>{selectedToken.symbol}</span>
              <button 
                className="ml-2 p-1 hover:bg-gray-100 rounded-full" 
                onClick={clearSelection}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <Button
                  key={token.address || token.symbol}
                  variant="ghost"
                  className="w-full justify-start mb-1 px-2"
                  onClick={() => handleSelectToken(token)}
                >
                  <div className="flex items-center gap-2">
                    {token.logoURI && (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-5 h-5 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="text-left">
                      <div>{token.symbol}</div>
                      <div className="text-xs text-muted-foreground">{token.name}</div>
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tokens found
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default TokenSelectorNew;
