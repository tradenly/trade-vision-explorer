
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

/**
 * Load tokens from Supabase database
 */
export async function loadTokensFromDb(chainId: number): Promise<TokenInfo[]> {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .order('symbol');
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Failed to load tokens for chain ${chainId}:`, error);
    return loadFallbackTokens(chainId);
  }
}

/**
 * Fallback token data if database isn't available
 */
export function loadFallbackTokens(chainId: number): TokenInfo[] {
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
        // Try fetch from database first
        const dbTokens = await loadTokensFromDb(chainId);
        
        if (dbTokens.length > 0) {
          setTokens(dbTokens);
        } else {
          // If that fails, use fallbacks
          setTokens(loadFallbackTokens(chainId));
          
          // Try to sync tokens in background
          supabase.functions.invoke('sync-tokens', {
            body: { chainId }
          }).catch(e => console.error('Error syncing tokens:', e));
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
