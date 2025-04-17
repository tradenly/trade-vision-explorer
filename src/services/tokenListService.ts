
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

// Chain identifiers - expanded to include additional chains
export enum ChainId {
  ETHEREUM = 1,
  OPTIMISM = 10,
  POLYGON = 137,
  ARBITRUM = 42161,
  BASE = 8453,
  BNB = 56,
  SOLANA = 101
}

// Chain names for display
export const CHAIN_NAMES: Record<number, string> = {
  [ChainId.ETHEREUM]: 'Ethereum',
  [ChainId.OPTIMISM]: 'Optimism',
  [ChainId.POLYGON]: 'Polygon',
  [ChainId.ARBITRUM]: 'Arbitrum',
  [ChainId.BASE]: 'Base',
  [ChainId.BNB]: 'BNB Chain',
  [ChainId.SOLANA]: 'Solana'
};

// CORS safe token list URLs - updated to use more reliable endpoints
const CORS_SAFE_URLS = {
  ethereum: [
    'https://tokens.coingecko.com/uniswap/all.json',
    'https://tokens.coingecko.com/ethereum/all.json'
  ],
  bnb: [
    'https://tokens.coingecko.com/binance-smart-chain/all.json',
    'https://tokens.pancakeswap.finance/pancakeswap-extended.json'
  ],
  solana: [
    // No direct token list API, we'll use our defaults
  ]
};

// Default tokens for each chain
const DEFAULT_ETHEREUM_TOKENS: TokenInfo[] = [
  { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
  { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
  { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
  { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
  { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
];

const DEFAULT_BNB_TOKENS: TokenInfo[] = [
  { name: 'BNB', symbol: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.BNB },
  { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, chainId: ChainId.BNB },
  { name: 'BUSD', symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, chainId: ChainId.BNB },
  { name: 'USDT', symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, chainId: ChainId.BNB },
];

const DEFAULT_SOLANA_TOKENS: TokenInfo[] = [
  { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9, chainId: ChainId.SOLANA },
  { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, chainId: ChainId.SOLANA },
  { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, chainId: ChainId.SOLANA },
  { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, chainId: ChainId.SOLANA },
  { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, chainId: ChainId.SOLANA },
];

// Generate a valid token address if needed
const generateTokenAddress = (token: TokenInfo): string => {
  // If the address is empty, null or undefined, generate a pseudo-address
  if (!token.address || token.address === '' || token.address === 'undefined') {
    return `generated-${token.symbol}-${Math.random().toString(36).substring(2, 15)}`;
  }
  return token.address;
};

// Ensure all tokens have valid addresses
const validateTokens = (tokens: TokenInfo[]): TokenInfo[] => {
  if (!tokens || !Array.isArray(tokens)) {
    console.error('Invalid tokens array:', tokens);
    return [];
  }
  
  return tokens
    .filter(token => token && typeof token === 'object') // Filter out non-objects
    .map(token => {
      if (!token.address || token.address === '' || token.address === 'undefined') {
        // Generate a pseudo-address if needed to avoid empty strings
        return {
          ...token,
          address: generateTokenAddress(token)
        };
      }
      return token;
    })
    // Filter out duplicates and invalid tokens
    .filter((token, index, self) => 
      // Keep only tokens with valid properties
      token.symbol && token.name && 
      // Remove duplicates by address
      index === self.findIndex(t => t.address === token.address)
    );
};

// Fetch Ethereum tokens with improved error handling
export async function fetchEthereumTokens(): Promise<TokenInfo[]> {
  try {
    console.log('Fetching Ethereum tokens...');
    
    // Try CoinGecko API - CORS friendly
    const url = 'https://tokens.coingecko.com/uniswap/all.json';
    console.log(`Attempting to fetch Ethereum tokens from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid response format');
    }
    
    // Only include Ethereum tokens and validate them
    const tokens = validateTokens(data.tokens.filter(token => token.chainId === 1));
    
    console.log(`Fetched ${tokens.length} Ethereum tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching Ethereum tokens:', error);
    
    // Return default tokens if fetching failed
    console.log('Using default Ethereum token list');
    return DEFAULT_ETHEREUM_TOKENS;
  }
}

// Fetch BNB Chain tokens with error handling
export async function fetchBnbTokens(): Promise<TokenInfo[]> {
  try {
    console.log('Fetching BNB Chain tokens...');
    
    // Try CoinGecko API for BNB Chain - CORS friendly
    const url = 'https://tokens.coingecko.com/binance-smart-chain/all.json';
    console.log(`Attempting to fetch BNB tokens from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid response format');
    }
    
    // Filter for BNB Chain tokens and validate them
    const tokens = validateTokens(data.tokens);
    
    console.log(`Fetched ${tokens.length} BNB Chain tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching BNB tokens:', error);
    
    // Return default tokens if fetching failed
    console.log('Using default BNB token list');
    return DEFAULT_BNB_TOKENS;
  }
}

// Fetch Solana tokens
export async function fetchSolanaTokens(): Promise<TokenInfo[]> {
  // For simplicity and reliability, we'll just use our default Solana tokens
  // In a production environment, you could integrate with Jupiter API
  console.log('Using default Solana tokens');
  return DEFAULT_SOLANA_TOKENS;
}

// Fetch all tokens from all supported chains with improved error handling
export async function fetchAllTokens(): Promise<Record<number, TokenInfo[]>> {
  const results: Record<number, TokenInfo[]> = {};
  
  try {
    // Fetch tokens for each chain in parallel with individual error handling
    const [ethereumTokens, bnbTokens, solanaTokens] = await Promise.all([
      fetchEthereumTokens().catch(err => {
        console.error('Error in Ethereum token fetch:', err);
        return DEFAULT_ETHEREUM_TOKENS;
      }),
      fetchBnbTokens().catch(err => {
        console.error('Error in BNB token fetch:', err);
        return DEFAULT_BNB_TOKENS;
      }),
      fetchSolanaTokens().catch(err => {
        console.error('Error in Solana token fetch:', err);
        return DEFAULT_SOLANA_TOKENS;
      }),
    ]);
    
    // Store the results
    results[ChainId.ETHEREUM] = ethereumTokens;
    results[ChainId.BNB] = bnbTokens;
    results[ChainId.SOLANA] = solanaTokens;
    
    return results;
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    
    // Return default tokens if all fetching failed
    return {
      [ChainId.ETHEREUM]: DEFAULT_ETHEREUM_TOKENS,
      [ChainId.BNB]: DEFAULT_BNB_TOKENS,
      [ChainId.SOLANA]: DEFAULT_SOLANA_TOKENS,
    };
  }
}
