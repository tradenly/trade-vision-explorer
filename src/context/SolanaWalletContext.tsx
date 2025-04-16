
import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { getSolanaBalance } from '@/services/solanaWalletService';
import { PublicKey } from '@solana/web3.js';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletContextType {
  address: string | null;
  balance: number | null;
  isConnected: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  address: null,
  balance: null,
  isConnected: false,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
});

export const useSolanaWallet = () => useContext(SolanaWalletContext);

// Internal hook to handle wallet operations
const SolanaWalletContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey, connected, disconnect, connect, select, wallets } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  // Get wallet balance
  const fetchBalance = useCallback(async () => {
    if (publicKey) {
      const solBalance = await getSolanaBalance(publicKey);
      setBalance(solBalance);
    } else {
      setBalance(null);
    }
  }, [publicKey]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      if (!connected && wallets.length > 0) {
        await connect();
        await fetchBalance();
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  }, [connected, connect, wallets.length, fetchBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      if (connected) {
        await disconnect();
        setBalance(null);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, [connected, disconnect]);

  // Update balance when connection changes
  React.useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    }
  }, [connected, publicKey, fetchBalance]);

  return (
    <SolanaWalletContext.Provider
      value={{
        address: publicKey ? publicKey.toString() : null,
        balance,
        isConnected: connected,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </SolanaWalletContext.Provider>
  );
};

// Main provider component that sets up Solana wallet adapters
export const SolanaWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  
  // Configure wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <SolanaWalletContextProvider>
            {children}
          </SolanaWalletContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
