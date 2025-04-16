
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// RPC endpoint for Solana
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

// Get connection to Solana
export const getSolanaConnection = (): Connection => {
  return new Connection(SOLANA_RPC_URL);
};

// Get SOL balance for an address
export const getSolanaBalance = async (publicKey: PublicKey): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    return 0;
  }
};

// Format wallet address to shorter version
export const formatWalletAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
