
import { ChainId, TokenInfo } from './tokenListService';
import { supabase } from '@/lib/supabaseClient';

// Default tokens for fallback
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
  ]
};

export const POPULAR_TOKEN_SYMBOLS = {
  [ChainId.ETHEREUM]: ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'],
  [ChainId.BNB]: ['BNB', 'WBNB', 'BUSD', 'USDT', 'USDC', 'CAKE', 'BTC', 'ETH'],
  [ChainId.SOLANA]: ['SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY', 'SBR']
};

export const QUOTE_TOKEN_SYMBOLS = {
  [ChainId.ETHEREUM]: ['USDC', 'USDT', 'DAI', 'ETH', 'WETH'],
  [ChainId.BNB]: ['BUSD', 'USDT', 'USDC', 'BNB', 'WBNB'],
  [ChainId.SOLANA]: ['USDC', 'USDT', 'SOL']
};

/**
 * Gets a valid token value (used for address)
 */
export function getSafeTokenValue(token: TokenInfo): string {
  return `${token.symbol.toLowerCase()}-${token.chainId}`;
}

/**
 * Fetch token list for a specific chain from our edge function
 */
export async function getTokensForChain(chainId: ChainId): Promise<TokenInfo[]> {
  try {
    console.log(`Fetching token list for chain ${chainId}...`);
    
    const { data, error } = await supabase.functions.invoke('fetch-tokens', {
      body: { chainId }
    });

    if (error) {
      console.error('Error fetching tokens:', error);
      return DEFAULT_TOKENS[chainId] || [];
    }

    if (data?.tokens && Array.isArray(data.tokens)) {
      console.log(`Successfully fetched ${data.tokens.length} tokens for chain ${chainId}`);
      return data.tokens.map((token: any) => ({
        address: token.address || getSafeTokenValue(token),
        chainId: token.chain_id || chainId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals || 18,
        logoURI: token.logo_uri || null
      }));
    }

    return DEFAULT_TOKENS[chainId] || [];
  } catch (error) {
    console.error('Error in getTokensForChain:', error);
    return DEFAULT_TOKENS[chainId] || [];
  }
}

/**
 * Get a filtered list of quote tokens for a specific chain
 */
export function getQuoteTokensForChain(chainId: ChainId, allTokens: TokenInfo[]): TokenInfo[] {
  try {
    const quoteSymbols = QUOTE_TOKEN_SYMBOLS[chainId] || [];
    
    // Filter tokens by quote symbols
    return allTokens.filter(token => 
      quoteSymbols.includes(token.symbol)
    );
  } catch (error) {
    console.error('Error getting quote tokens:', error);
    return [];
  }
}

/**
 * Get a filtered list of popular tokens for a specific chain
 */
export function getPopularTokensForChain(chainId: ChainId, allTokens: TokenInfo[]): TokenInfo[] {
  try {
    const popularSymbols = POPULAR_TOKEN_SYMBOLS[chainId] || [];
    
    // Filter tokens by popular symbols
    return allTokens.filter(token => 
      popularSymbols.includes(token.symbol)
    );
  } catch (error) {
    console.error('Error getting popular tokens:', error);
    return [];
  }
}

/**
 * Search for tokens by name or symbol
 */
export function searchTokens(query: string, tokens: TokenInfo[]): TokenInfo[] {
  if (!query) return tokens;
  
  const lowerQuery = query.toLowerCase();
  
  return tokens.filter(token => 
    token.name.toLowerCase().includes(lowerQuery) || 
    token.symbol.toLowerCase().includes(lowerQuery) ||
    token.address.toLowerCase().includes(lowerQuery)
  );
}
