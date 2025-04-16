
import { supabase } from '@/lib/supabaseClient';

export interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  extensions?: {
    bridgeInfo?: Record<string, { tokenAddress: string }>;
  };
}

export interface TokenList {
  name: string;
  logoURI: string;
  timestamp: string;
  tokens: TokenInfo[];
  version: {
    major: number;
    minor: number;
    patch: number;
  };
}

// Chain identifiers
export enum ChainId {
  ETHEREUM = 1,
  BNB = 56,
  SOLANA = 101
}

// Chain names for display
export const CHAIN_NAMES: Record<number, string> = {
  [ChainId.ETHEREUM]: 'Ethereum',
  [ChainId.BNB]: 'BNB Chain',
  [ChainId.SOLANA]: 'Solana'
};

// Fetch Uniswap token list (Ethereum)
export async function fetchEthereumTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://gateway.ipfs.io/ipns/tokens.uniswap.org');
    const data: TokenList = await response.json();
    return data.tokens.filter(token => token.chainId === ChainId.ETHEREUM);
  } catch (error) {
    console.error('Error fetching Ethereum tokens:', error);
    return [];
  }
}

// Fetch BNB Chain token list from PancakeSwap
export async function fetchBnbTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://tokens.pancakeswap.finance/pancakeswap-extended.json');
    const data: TokenList = await response.json();
    return data.tokens.filter(token => token.chainId === ChainId.BNB);
  } catch (error) {
    console.error('Error fetching BNB tokens:', error);
    return [];
  }
}

// Fetch Solana token list from Jupiter
export async function fetchSolanaTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
    const data: TokenList = await response.json();
    
    // Transform to match our interface
    return data.tokens.map(token => ({
      ...token,
      chainId: ChainId.SOLANA,
    }));
  } catch (error) {
    console.error('Error fetching Solana tokens:', error);
    return [];
  }
}

// Fetch all tokens from all supported chains
export async function fetchAllTokens(): Promise<Record<number, TokenInfo[]>> {
  const [ethereumTokens, bnbTokens, solanaTokens] = await Promise.all([
    fetchEthereumTokens(),
    fetchBnbTokens(),
    fetchSolanaTokens(),
  ]);

  return {
    [ChainId.ETHEREUM]: ethereumTokens,
    [ChainId.BNB]: bnbTokens,
    [ChainId.SOLANA]: solanaTokens,
  };
}
