
import React from 'react';
import { Button } from '@/components/ui/button';
import { useSolanaWallet } from '@/context/SolanaWalletContext';
import { formatWalletAddress } from '@/services/solanaWalletService';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Wallet } from 'lucide-react';

const SolanaConnect: React.FC = () => {
  const { address, balance, isConnected, disconnectWallet } = useSolanaWallet();

  return (
    <div className="p-4 border rounded-md bg-background">
      <h3 className="font-medium mb-3">Solana Wallets</h3>
      
      {!isConnected ? (
        <div className="solana-connect-wrapper" style={{ width: '100%' }}>
          <WalletMultiButton className="wallet-adapter-button-trigger" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono text-xs truncate">{address && formatWalletAddress(address)}</span>
            
            <span className="text-muted-foreground">Balance:</span>
            <span>{balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}</span>
            
            <span className="text-muted-foreground">Network:</span>
            <span>Solana</span>
          </div>
          
          <Button 
            onClick={disconnectWallet} 
            variant="outline" 
            size="sm"
            className="w-full"
          >
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
};

export default SolanaConnect;
