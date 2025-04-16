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

// Fetch Ethereum tokens with error handling and retry logic
export async function fetchEthereumTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.ETHEREUM)) {
    return tokenCache[ChainId.ETHEREUM].tokens;
  }

  try {
    // Try primary source
    const response = await fetch('https://gateway.ipfs.io/ipns/tokens.uniswap.org');
    if (!response.ok) {
      throw new Error(`Failed to fetch Ethereum tokens: ${response.status} ${response.statusText}`);
    }
    
    const data: TokenList = await response.json();
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
    console.error('Error fetching Ethereum tokens from primary source:', error);
    
    try {
      // Try backup source
      const backupResponse = await fetch('https://tokens.coingecko.com/uniswap/all.json');
      if (backupResponse.ok) {
        const backupData: TokenList = await backupResponse.json();
        const tokens = validateTokens(backupData.tokens.filter(token => token.chainId === ChainId.ETHEREUM));
        
        // Cache the results
        tokenCache[ChainId.ETHEREUM] = {
          tokens,
          timestamp: Date.now()
        };
        
        console.log(`Fetched ${tokens.length} Ethereum tokens from backup source`);
        return tokens;
      }
    } catch (backupError) {
      console.error('Error fetching Ethereum tokens from backup source:', backupError);
    }
    
    // Return cached data if available, even if expired
    if (tokenCache[ChainId.ETHEREUM]) {
      console.log('Using cached Ethereum token data');
      return tokenCache[ChainId.ETHEREUM].tokens;
    }
    
    // Last resort: Return some predefined tokens
    const fallbackTokens: TokenInfo[] = [
      { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
      { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
      { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
      { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
      { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
    ];
    
    console.log('Using fallback Ethereum token data');
    return fallbackTokens;
  }
}

// Fetch BNB Chain tokens with error handling and retry logic
export async function fetchBnbTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.BNB)) {
    return tokenCache[ChainId.BNB].tokens;
  }

  try {
    const response = await fetch('https://tokens.pancakeswap.finance/pancakeswap-extended.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch BNB tokens: ${response.status} ${response.statusText}`);
    }
    
    const data: TokenList = await response.json();
    const tokens = validateTokens(data.tokens.filter(token => token.chainId === ChainId.BNB));
    
    // Cache the results
    tokenCache[ChainId.BNB] = {
      tokens,
      timestamp: Date.now()
    };
    
    return tokens;
  } catch (error) {
    console.error('Error fetching BNB tokens:', error);
    
    // Return cached data if available, even if expired
    if (tokenCache[ChainId.BNB]) {
      console.log('Using cached BNB token data');
      return tokenCache[ChainId.BNB].tokens;
    }
    
    return [];
  }
}

// Fetch Solana tokens with error handling and retry logic
export async function fetchSolanaTokens(): Promise<TokenInfo[]> {
  if (isCacheValid(ChainId.SOLANA)) {
    return tokenCache[ChainId.SOLANA].tokens;
  }

  try {
    const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
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
    
    return tokens;
  } catch (error) {
    console.error('Error fetching Solana tokens:', error);
    
    // Return cached data if available, even if expired
    if (tokenCache[ChainId.SOLANA]) {
      console.log('Using cached Solana token data');
      return tokenCache[ChainId.SOLANA].tokens;
    }
    
    return [];
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
        return [] as TokenInfo[];
      }),
      fetchBnbTokens().catch(err => {
        console.error('Error in BNB token fetch:', err);
        return [] as TokenInfo[];
      }),
      fetchSolanaTokens().catch(err => {
        console.error('Error in Solana token fetch:', err);
        return [] as TokenInfo[];
      }),
    ]);
    
    // Only add chains with valid tokens
    if (ethereumTokens.length > 0) results[ChainId.ETHEREUM] = ethereumTokens;
    if (bnbTokens.length > 0) results[ChainId.BNB] = bnbTokens;
    if (solanaTokens.length > 0) results[ChainId.SOLANA] = solanaTokens;
    
    // If any chain has no tokens, try to get cached data
    if (!results[ChainId.ETHEREUM] && tokenCache[ChainId.ETHEREUM]) {
      results[ChainId.ETHEREUM] = tokenCache[ChainId.ETHEREUM].tokens;
    }
    if (!results[ChainId.BNB] && tokenCache[ChainId.BNB]) {
      results[ChainId.BNB] = tokenCache[ChainId.BNB].tokens;
    }
    if (!results[ChainId.SOLANA] && tokenCache[ChainId.SOLANA]) {
      results[ChainId.SOLANA] = tokenCache[ChainId.SOLANA].tokens;
    }
    
    // If still no tokens for a chain, add fallbacks
    if (!results[ChainId.ETHEREUM] || results[ChainId.ETHEREUM].length === 0) {
      results[ChainId.ETHEREUM] = [
        { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
        { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
        { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
        { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
        { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
      ];
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching all tokens:', error);
    
    // Return cached data if available
    return {
      [ChainId.ETHEREUM]: tokenCache[ChainId.ETHEREUM]?.tokens || [],
      [ChainId.BNB]: tokenCache[ChainId.BNB]?.tokens || [],
      [ChainId.SOLANA]: tokenCache[ChainId.SOLANA]?.tokens || [],
    };
  }
}
