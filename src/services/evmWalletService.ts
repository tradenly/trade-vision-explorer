
import { ethers } from 'ethers';

// Initialize provider and check if MetaMask is available
const getEthereumProvider = (): ethers.providers.Web3Provider | null => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return null;
};

// Connect to MetaMask
export const connectMetaMask = async (): Promise<{
  address: string;
  balance: string;
  chainId: number;
  chainName: string;
} | null> => {
  try {
    const provider = getEthereumProvider();
    if (!provider) {
      console.error('MetaMask not installed');
      return null;
    }

    // Request account access
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // Get network and balance
    const network = await provider.getNetwork();
    const balanceWei = await provider.getBalance(address);
    const balance = ethers.utils.formatEther(balanceWei);
    
    // Map chainId to network name
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      56: 'Binance Smart Chain',
      137: 'Polygon',
      8453: 'Base',
      42161: 'Arbitrum',
      10: 'Optimism',
      43114: 'Avalanche',
      59144: 'Blast',
      7777777: 'Zora',
    };
    
    const chainName = chainNames[network.chainId] || `Chain ID: ${network.chainId}`;
    
    return {
      address,
      balance,
      chainId: network.chainId,
      chainName,
    };
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    return null;
  }
};

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
};

// Listen for account changes
export const addAccountChangeListener = (callback: (accounts: string[]) => void): void => {
  if (typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
};

// Listen for chain changes
export const addChainChangeListener = (callback: (chainId: string) => void): void => {
  if (typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
};

// Remove listeners (call on component unmount)
export const removeListeners = (): void => {
  if (typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
};
