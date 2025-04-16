
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { connectMetaMask, addAccountChangeListener, addChainChangeListener, removeListeners } from '@/services/evmWalletService';

interface EthereumWalletContextType {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  chainName: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const EthereumWalletContext = createContext<EthereumWalletContextType>({
  address: null,
  balance: null,
  chainId: null,
  chainName: null,
  isConnecting: false,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
});

export const useEthereumWallet = () => useContext(EthereumWalletContext);

export const EthereumWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainName, setChainName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const walletData = await connectMetaMask();
      if (walletData) {
        setAddress(walletData.address);
        setBalance(walletData.balance);
        setChainId(walletData.chainId);
        setChainName(walletData.chainName);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    setChainName(null);
    setIsConnected(false);
  };

  useEffect(() => {
    // Set up listeners for account and chain changes
    addAccountChangeListener((accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnectWallet();
      } else if (address !== accounts[0]) {
        // Account changed, refresh connection
        connectWallet();
      }
    });

    addChainChangeListener(() => {
      // Chain changed, refresh connection
      if (isConnected) {
        connectWallet();
      }
    });

    return () => {
      removeListeners();
    };
  }, [address, isConnected]);

  return (
    <EthereumWalletContext.Provider
      value={{
        address,
        balance,
        chainId,
        chainName,
        isConnecting,
        isConnected,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </EthereumWalletContext.Provider>
  );
};
