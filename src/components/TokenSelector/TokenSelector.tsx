
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChainId, CHAIN_NAMES, TokenInfo, fetchAllTokens } from '@/services/tokenListService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // Load tokens on component mount
  useEffect(() => {
    async function loadTokens() {
      setLoading(true);
      const allTokens = await fetchAllTokens();
      setTokens(allTokens);
      setLoading(false);
    }

    loadTokens();
  }, []);

  // Handler for chain selection
  const handleChainChange = (value: string) => {
    const chainId = parseInt(value) as ChainId;
    if (onSelectChain) {
      onSelectChain(chainId);
    }
    setSelectedToken(null);
  };

  // Filter tokens based on search input
  const filteredTokens = tokens[selectedChain]?.filter(token => 
    token.name.toLowerCase().includes(search.toLowerCase()) || 
    token.symbol.toLowerCase().includes(search.toLowerCase())
  ) || [];

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    if (onSelectToken) {
      onSelectToken(token);
    }
    setOpen(false);
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
            <SelectValue placeholder="Select a chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Supported Chains</SelectLabel>
              {Object.entries(CHAIN_NAMES).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
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
              className="w-full justify-between"
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
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search tokens..." 
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No tokens found</CommandEmpty>
                <CommandGroup>
                  <ScrollArea className="h-72">
                    {loading ? (
                      <div className="p-2 text-center">Loading tokens...</div>
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
