
import { ChainId, TokenInfo } from './tokenListService';
import { supabase } from '@/lib/supabaseClient';

// Cache token data to reduce API calls
const tokenCache: Record<number, {
  data: TokenInfo[];
  timestamp: number;
  expiry: number;
}> = {};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Default tokens by chain - used as fallback when API fails
export const DEFAULT_TOKENS: Record<number, TokenInfo[]> = {
  [ChainId.ETHEREUM]: [
    { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM },
    { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM },
    { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM },
    { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM },
    { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM },
  ],
  [ChainId.BNB]: [
    { name: 'BNB', symbol: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.BNB },
    { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, chainId: ChainId.BNB },
    { name: 'BUSD', symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, chainId: ChainId.BNB },
    { name: 'USDT', symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, chainId: ChainId.BNB },
  ],
  [ChainId.SOLANA]: [
    { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9, chainId: ChainId.SOLANA },
    { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, chainId: ChainId.SOLANA },
    { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, chainId: ChainId.SOLANA },
    { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, chainId: ChainId.SOLANA },
    { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, chainId: ChainId.SOLANA },
  ],
};

// Common quote tokens by chain
export const COMMON_QUOTE_TOKENS: Record<number, string[]> = {
  [ChainId.ETHEREUM]: ['USDT', 'USDC', 'DAI', 'WETH', 'WBTC'],
  [ChainId.BNB]: ['BUSD', 'USDT', 'USDC', 'WBNB', 'ETH'],
  [ChainId.SOLANA]: ['USDC', 'USDT', 'SOL', 'BTC', 'ETH']
};

/**
 * Fetch tokens from Supabase as first option
 */
async function fetchTokensFromSupabase(chainId: ChainId): Promise<TokenInfo[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId);
      
    if (error) throw error;
    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} tokens for chain ${chainId} from Supabase`);
      return data as TokenInfo[];
    }
    return [];
  } catch (err) {
    console.error('Error fetching tokens from Supabase:', err);
    return [];
  }
}

/**
 * Fetch tokens from a public API with CORS support
 */
async function fetchTokensFromPublicAPI(chainId: ChainId): Promise<TokenInfo[]> {
  let url = '';
  let chainFilter: number | null = null;
  
  switch (chainId) {
    case ChainId.ETHEREUM:
      url = 'https://tokens.coingecko.com/uniswap/all.json';
      chainFilter = 1;
      break;
    case ChainId.BNB:
      url = 'https://tokens.coingecko.com/binance-smart-chain/all.json';
      chainFilter = 56;
      break;
    case ChainId.SOLANA:
      // No direct CORS-friendly endpoint for Solana tokens
      return DEFAULT_TOKENS[ChainId.SOLANA];
    default:
      return DEFAULT_TOKENS[chainId] || [];
  }
  
  try {
    console.log(`Fetching tokens for chain ${chainId} from ${url}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {'Accept': 'application/json'},
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API response: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid token list format');
    }
    
    // Filter tokens for specific chain if needed
    let tokens = data.tokens;
    if (chainFilter) {
      tokens = tokens.filter((t: any) => t.chainId === chainFilter);
    }
    
    // Normalize token data
    const normalizedTokens = tokens.map((token: any) => ({
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      logoURI: token.logoURI,
      chainId: chainId,
    }));
    
    console.log(`Fetched ${normalizedTokens.length} tokens for chain ${chainId}`);
    return normalizedTokens;
  } catch (error) {
    console.error(`Error fetching tokens for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Get tokens for a specific chain with caching
 */
export async function getTokensForChain(chainId: ChainId): Promise<TokenInfo[]> {
  // Check cache first
  const cachedData = tokenCache[chainId];
  if (cachedData && Date.now() - cachedData.timestamp < cachedData.expiry) {
    console.log(`Using cached tokens for chain ${chainId}`);
    return cachedData.data;
  }
  
  console.log(`Fetching fresh tokens for chain ${chainId}`);
  
  try {
    // First try to get from Supabase
    let tokens = await fetchTokensFromSupabase(chainId);
    
    // If no tokens from Supabase, try public API
    if (!tokens || tokens.length === 0) {
      tokens = await fetchTokensFromPublicAPI(chainId);
    }
    
    // If still no tokens, use defaults
    if (!tokens || tokens.length === 0) {
      tokens = DEFAULT_TOKENS[chainId] || [];
    }
    
    // Ensure all tokens are valid
    const validatedTokens = tokens
      .filter(token => token && token.symbol && token.name)
      .map(token => {
        // Ensure token has a valid address
        if (!token.address || token.address === '' || token.address === 'undefined') {
          return {
            ...token,
            address: `generated-${token.symbol}-${token.chainId}-${Math.random().toString(36).substring(2, 7)}`
          };
        }
        return token;
      });
    
    // Update cache
    tokenCache[chainId] = {
      data: validatedTokens,
      timestamp: Date.now(),
      expiry: CACHE_DURATION
    };
    
    return validatedTokens;
  } catch (error) {
    console.error(`Error in getTokensForChain(${chainId}):`, error);
    // Fall back to default tokens
    return DEFAULT_TOKENS[chainId] || [];
  }
}

/**
 * Get only the common quote tokens for a chain
 */
export function getQuoteTokensForChain(chainId: ChainId, allTokens: TokenInfo[]): TokenInfo[] {
  const commonSymbols = COMMON_QUOTE_TOKENS[chainId] || [];
  
  try {
    // Filter tokens that match common quote symbols
    const quoteTokens = allTokens.filter(token => 
      token.symbol && commonSymbols.includes(token.symbol)
    );
    
    // If no quote tokens found, return defaults
    if (quoteTokens.length === 0) {
      return DEFAULT_TOKENS[chainId] || [];
    }
    
    return quoteTokens;
  } catch (error) {
    console.error(`Error getting quote tokens for chain ${chainId}:`, error);
    return DEFAULT_TOKENS[chainId] || [];
  }
}

/**
 * Get the popular tokens for a chain
 */
export function getPopularTokensForChain(chainId: ChainId, allTokens: TokenInfo[]): TokenInfo[] {
  let popularSymbols: string[] = [];
  
  switch (chainId) {
    case ChainId.ETHEREUM:
      popularSymbols = ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC'];
      break;
    case ChainId.BNB:
      popularSymbols = ['BNB', 'WBNB', 'BUSD', 'USDT', 'USDC'];
      break;
    case ChainId.SOLANA:
      popularSymbols = ['SOL', 'USDC', 'USDT', 'BONK', 'JUP'];
      break;
    default:
      popularSymbols = ['ETH', 'WETH', 'USDT', 'USDC'];
  }

  try {
    const popularTokens = allTokens.filter(token => 
      token.symbol && popularSymbols.includes(token.symbol)
    );
    
    if (popularTokens.length === 0) {
      return DEFAULT_TOKENS[chainId] || [];
    }
    
    return popularTokens;
  } catch (error) {
    console.error(`Error getting popular tokens for chain ${chainId}:`, error);
    return DEFAULT_TOKENS[chainId] || [];
  }
}

/**
 * Get token by address
 */
export function findTokenByAddress(address: string, allTokens: TokenInfo[]): TokenInfo | undefined {
  if (!address) return undefined;
  return allTokens.find(token => token.address?.toLowerCase() === address.toLowerCase());
}

/**
 * Generate a valid token ID/value for dropdowns
 */
export function getSafeTokenValue(token: TokenInfo | null): string {
  if (!token) return "";
  if (!token.symbol) return "";
  if (!token.address || token.address === '' || token.address === 'undefined') {
    return `${token.symbol}-${token.chainId}-fallback`;
  }
  return token.address;
}
