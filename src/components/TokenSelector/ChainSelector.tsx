
import React from 'react';
import { ChainId } from '@/services/tokenListService';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Only support Ethereum, BNB, and Solana
const SUPPORTED_CHAINS: Record<number, string> = {
  [ChainId.ETHEREUM]: 'Ethereum',
  [ChainId.BNB]: 'BNB Chain',
  [ChainId.SOLANA]: 'Solana'
};

interface ChainSelectorProps {
  selectedChain: ChainId;
  onChainChange: (chainId: ChainId) => void;
}

const ChainSelector: React.FC<ChainSelectorProps> = ({ selectedChain, onChainChange }) => {
  const chainLogos: Record<number, string> = {
    [ChainId.ETHEREUM]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//ethereum-icon.png',
    [ChainId.BNB]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//bnb-icon.png',
    [ChainId.SOLANA]: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//solana-icon.png',
  };
  
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">Blockchain</label>
      <Select 
        value={selectedChain.toString()} 
        onValueChange={(value) => onChainChange(parseInt(value) as ChainId)}
      >
        <SelectTrigger className="w-full bg-background border border-input">
          <SelectValue placeholder="Select Blockchain" />
        </SelectTrigger>
        <SelectContent className="bg-background border border-input">
          <SelectGroup>
            {Object.entries(SUPPORTED_CHAINS).map(([id, name]) => (
              <SelectItem key={id} value={id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <img 
                    src={chainLogos[Number(id)]} 
                    alt={name} 
                    className="w-5 h-5 rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <span>{name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ChainSelector;
