
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

// Cache for token lists to avoid refetching
const tokenCache: Record<number, {
  tokens: TokenInfo[];
  timestamp: number;
}> = {};

// Cache expiry time in milliseconds (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Check if cache is valid
const isCacheValid = (chainId: number): boolean => {
  const cache = tokenCache[chainId];
  if (!cache) return false;
  
  const now = Date.now();
  return (now - cache.timestamp) < CACHE_EXPIRY_MS;
};

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
  return tokens.map(token => {
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
];

// CORS safe token list URLs
const CORS_SAFE_URLS = {
  ethereum: [
    'https://tokens.coingecko.com/uniswap/all.json',
    'https://wispy-bird-88a7.uniswap.workers.dev/?url=http://tokens.1inch.eth.link'
  ],
  bnb: [
    'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
    'https://tokens.coingecko.com/binance-smart-chain/all.json'
  ],
  solana: [
    'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json'
  ]
};

// Fetch Ethereum tokens with error handling and retry logic
export async function fetchEthereumTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.ETHEREUM)) {
    return tokenCache[ChainId.ETHEREUM].tokens;
  }

  try {
    // Try each CORS-safe URL until one works
    let data: TokenList | null = null;
    let error = null;
    
    for (const url of CORS_SAFE_URLS.ethereum) {
      try {
        console.log(`Attempting to fetch Ethereum tokens from: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch (err) {
        error = err;
        console.error(`Failed to fetch from ${url}:`, err);
        // Continue to the next URL
      }
    }
    
    if (!data) {
      console.error('All Ethereum token URLs failed', error);
      throw new Error('Failed to fetch Ethereum tokens from all sources');
    }
    
    // Only include Ethereum tokens and validate them
    const tokens = validateTokens(data.tokens.filter(token => token.chainId === ChainId.ETHEREUM));
    
    // Cache the results
    tokenCache[ChainId.ETHEREUM] = {
      tokens,
      timestamp: Date.now()
    };
    
    console.log(`Fetched ${tokens.length} Ethereum tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching Ethereum tokens from all sources:', error);
    
    // Return default tokens if all fetching attempts failed
    console.log('Using default Ethereum token list');
    return DEFAULT_ETHEREUM_TOKENS;
  }
}

// Fetch BNB Chain tokens with error handling and retry logic
export async function fetchBnbTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.BNB)) {
    return tokenCache[ChainId.BNB].tokens;
  }

  try {
    // Try each CORS-safe URL until one works
    let data: TokenList | null = null;
    let error = null;
    
    for (const url of CORS_SAFE_URLS.bnb) {
      try {
        console.log(`Attempting to fetch BNB tokens from: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch (err) {
        error = err;
        console.error(`Failed to fetch from ${url}:`, err);
        // Continue to the next URL
      }
    }
    
    if (!data) {
      console.error('All BNB token URLs failed', error);
      throw new Error('Failed to fetch BNB tokens from all sources');
    }
    
    // Filter for BNB Chain tokens and validate them
    const tokens = validateTokens(data.tokens.filter(token => token.chainId === ChainId.BNB));
    
    // Cache the results
    tokenCache[ChainId.BNB] = {
      tokens,
      timestamp: Date.now()
    };
    
    console.log(`Fetched ${tokens.length} BNB Chain tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching BNB tokens:', error);
    
    // Return default tokens if all fetching attempts failed
    console.log('Using default BNB token list');
    return DEFAULT_BNB_TOKENS;
  }
}

// Fetch Solana tokens with error handling and retry logic
export async function fetchSolanaTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.SOLANA)) {
    return tokenCache[ChainId.SOLANA].tokens;
  }

  try {
    // Solana tokens are usually safer to fetch
    const response = await fetch(CORS_SAFE_URLS.solana[0]);
    if (!response.ok) {
      throw new Error(`Failed to fetch Solana tokens: ${response.status} ${response.statusText}`);
    }
    
    const data: TokenList = await response.json();
    
    // Transform to match our interface
    let tokens = data.tokens.map(token => ({
      ...token,
      chainId: ChainId.SOLANA,
    }));
    
    // Validate tokens to ensure they have addresses
    tokens = validateTokens(tokens);
    
    // Cache the results
    tokenCache[ChainId.SOLANA] = {
      tokens,
      timestamp: Date.now()
    };
    
    console.log(`Fetched ${tokens.length} Solana tokens`);
    return tokens;
  } catch (error) {
    console.error('Error fetching Solana tokens:', error);
    
    // Return default tokens if fetching failed
    console.log('Using default Solana token list');
    return DEFAULT_SOLANA_TOKENS;
  }
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
