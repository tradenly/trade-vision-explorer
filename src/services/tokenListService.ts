
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  price?: number;
}

export enum ChainId {
  ETHEREUM = 1,
  BNB = 56,
  SOLANA = 101,
  POLYGON = 137,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  BASE = 8453,
  AVALANCHE = 43114
}

export const CHAIN_NAMES: Record<number, string> = {
  [ChainId.ETHEREUM]: 'Ethereum',
  [ChainId.BNB]: 'BNB Chain',
  [ChainId.SOLANA]: 'Solana',
  [ChainId.POLYGON]: 'Polygon',
  [ChainId.ARBITRUM]: 'Arbitrum',
  [ChainId.OPTIMISM]: 'Optimism',
  [ChainId.BASE]: 'Base',
  [ChainId.AVALANCHE]: 'Avalanche'
};

const TOKEN_LISTS: Record<number, string> = {
  [ChainId.ETHEREUM]: 'https://tokens.coingecko.com/uniswap/all.json',
  [ChainId.BNB]: 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
  [ChainId.BASE]: 'https://raw.githubusercontent.com/base-org/tokenlists/main/lists/base.tokenlist.json',
  [ChainId.SOLANA]: 'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json'
};

/**
 * Load tokens from Supabase database or remote source
 */
export async function loadTokensFromDb(chainId: number): Promise<TokenInfo[]> {
  try {
    console.log(`Loading tokens for chain ${chainId}`);
    
    // First try to fetch from Supabase
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .order('symbol');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} tokens in database for chain ${chainId}`);
      return data;
    }
    
    // If no tokens in database, fetch from remote source
    console.log(`No tokens found in database for chain ${chainId}, fetching from remote source`);
    return await fetchTokensFromRemoteSource(chainId);
  } catch (error) {
    console.error(`Failed to load tokens for chain ${chainId}:`, error);
    
    // Try remote source as fallback
    try {
      return await fetchTokensFromRemoteSource(chainId);
    } catch (fetchError) {
      console.error(`Failed to fetch tokens from remote source for chain ${chainId}:`, fetchError);
      return loadFallbackTokens(chainId);
    }
  }
}

/**
 * Fetch tokens from remote source
 */
async function fetchTokensFromRemoteSource(chainId: number): Promise<TokenInfo[]> {
  const tokenListUrl = TOKEN_LISTS[chainId];
  
  if (!tokenListUrl) {
    console.warn(`No token list URL configured for chain ${chainId}`);
    return loadFallbackTokens(chainId);
  }
  
  try {
    console.log(`Fetching tokens from ${tokenListUrl}`);
    const response = await fetch(tokenListUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle different token list formats
    let tokens: TokenInfo[] = [];
    
    if (chainId === ChainId.SOLANA) {
      // Solana token list format
      tokens = (data.tokens || [])
        .filter((token: any) => token.chainId === chainId)
        .map((token: any) => ({
          address: token.address,
          chainId: token.chainId,
          decimals: token.decimals,
          name: token.name,
          symbol: token.symbol,
          logoURI: token.logoURI
        }));
    } else {
      // EVM token list format
      tokens = (data.tokens || [])
        .filter((token: any) => token.chainId === chainId)
        .map((token: any) => ({
          address: token.address,
          chainId: token.chainId,
          decimals: token.decimals,
          name: token.name,
          symbol: token.symbol,
          logoURI: token.logoURI || token.logo
        }));
    }
    
    console.log(`Fetched ${tokens.length} tokens for chain ${chainId}`);
    
    // Cache tokens in Supabase for future use
    if (tokens.length > 0) {
      try {
        // Batch insert tokens in chunks to avoid request size limits
        const chunkSize = 100;
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const chunk = tokens.slice(i, i + chunkSize);
          await supabase.from('tokens').upsert(chunk, { onConflict: 'address,chain_id' });
        }
        console.log(`Cached ${tokens.length} tokens in database for chain ${chainId}`);
      } catch (cacheError) {
        console.error('Failed to cache tokens in database:', cacheError);
      }
    }
    
    return tokens;
  } catch (error) {
    console.error(`Failed to fetch tokens from remote source for chain ${chainId}:`, error);
    return loadFallbackTokens(chainId);
  }
}

/**
 * Fallback token data if database and remote sources aren't available
 */
export function loadFallbackTokens(chainId: number): TokenInfo[] {
  console.log(`Using fallback tokens for chain ${chainId}`);
  // Basic tokens for each chain
  switch (chainId) {
    case ChainId.ETHEREUM:
      return [
        { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 1, decimals: 18, name: 'Ethereum', symbol: 'ETH', logoURI: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//ethereum-icon.png' },
        { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', chainId: 1, decimals: 6, name: 'Tether USD', symbol: 'USDT' },
        { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chainId: 1, decimals: 6, name: 'USD Coin', symbol: 'USDC' },
        { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', chainId: 1, decimals: 8, name: 'Wrapped BTC', symbol: 'WBTC' },
        { address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', chainId: 1, decimals: 18, name: 'Pepe', symbol: 'PEPE' }
      ];
    case ChainId.BNB:
      return [
        { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 56, decimals: 18, name: 'BNB', symbol: 'BNB', logoURI: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//bnb-icon.png' },
        { address: '0x55d398326f99059ff775485246999027b3197955', chainId: 56, decimals: 18, name: 'Tether USD', symbol: 'USDT' },
        { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', chainId: 56, decimals: 18, name: 'USD Coin', symbol: 'USDC' },
        { address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c', chainId: 56, decimals: 18, name: 'Binance BTC', symbol: 'BTCB' }
      ];
    case ChainId.SOLANA:
      return [
        { address: 'So11111111111111111111111111111111111111112', chainId: 101, decimals: 9, name: 'Wrapped SOL', symbol: 'SOL', logoURI: 'https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//solana-icon.png' },
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chainId: 101, decimals: 6, name: 'USD Coin', symbol: 'USDC' },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chainId: 101, decimals: 6, name: 'USDT', symbol: 'USDT' },
        { address: '9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i', chainId: 101, decimals: 6, name: 'Wrapped Ethereum', symbol: 'ETH' },
        { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chainId: 101, decimals: 6, name: 'Jupiter', symbol: 'JUP' }
      ];
    default:
      return [];
  }
}

/**
 * React hook to get tokens for a specific chain
 */
export function useTokensByChain(chainId: ChainId) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchTokens = async () => {
      setLoading(true);
      
      try {
        console.log(`Loading tokens for chain ${chainId}`);
        // Try fetch from database or remote source
        const fetchedTokens = await loadTokensFromDb(chainId);
        
        if (fetchedTokens.length > 0) {
          setTokens(fetchedTokens);
        } else {
          // If that fails, use fallbacks
          setTokens(loadFallbackTokens(chainId));
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
        setTokens(loadFallbackTokens(chainId));
      } finally {
        setLoading(false);
      }
    };
    
    fetchTokens();
  }, [chainId]);
  
  return { tokens, loading };
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] || 'Unknown Chain';
}

/**
 * Get chain logo from chain ID
 */
export function getChainLogo(chainId: number): string {
  const chainKey = Object.entries(ChainId)
    .find(([_, value]) => value === chainId)?.[0]
    ?.toLowerCase();
  
  if (chainKey) {
    return `https://fkagpyfzgczcaxsqwsoi.supabase.co/storage/v1/object/public/chains//${chainKey}-icon.png`;
  }
  
  return '';
}
