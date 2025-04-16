
import React from 'react';
import { Button } from '@/components/ui/button';
import { useEthereumWallet } from '@/context/EthereumWalletContext';
import { isMetaMaskInstalled } from '@/services/evmWalletService';
import { Wallet } from 'lucide-react';

const MetaMaskConnect: React.FC = () => {
  const { address, balance, chainName, isConnected, isConnecting, connectWallet, disconnectWallet } = useEthereumWallet();

  if (!isMetaMaskInstalled()) {
    return (
      <div className="p-4 border rounded-md bg-muted">
        <h3 className="font-medium mb-2">MetaMask not installed</h3>
        <a 
          href="https://metamask.io/download/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md bg-background">
      <h3 className="font-medium mb-3">MetaMask (EVM)</h3>
      
      {!isConnected ? (
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="w-full"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono text-xs truncate">{address}</span>
            
            <span className="text-muted-foreground">Balance:</span>
            <span>{balance ? `${parseFloat(balance).toFixed(4)} ETH` : '...'}</span>
            
            <span className="text-muted-foreground">Network:</span>
            <span>{chainName}</span>
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

export default MetaMaskConnect;
