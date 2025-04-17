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
    { name: 'Ethereum', symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { name: 'Wrapped Ether', symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png' },
    { name: 'USD Coin', symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
    { name: 'Tether', symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { name: 'Dai', symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png' },
    { name: 'Chainlink', symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
    { name: 'Bitcoin', symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
    { name: 'Uniswap', symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, chainId: ChainId.ETHEREUM, logoURI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png' },
  ],
  [ChainId.BNB]: [
    { name: 'BNB', symbol: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
    { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/12591/small/binance-coin-logo.png' },
    { name: 'BUSD', symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png' },
    { name: 'USDT', symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { name: 'Ethereum', symbol: 'ETH', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { name: 'Cake', symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, chainId: ChainId.BNB, logoURI: 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png' },
  ],
  [ChainId.SOLANA]: [
    { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
    { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg' },
    { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/34121/small/jup.png' },
    { name: 'Orca', symbol: 'ORCA', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', decimals: 6, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.jpg' },
    { name: 'Raydium', symbol: 'RAY', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', decimals: 6, chainId: ChainId.SOLANA, logoURI: 'https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg' },
  ],
};

// Common quote tokens by chain
export const COMMON_QUOTE_TOKENS: Record<number, string[]> = {
  [ChainId.ETHEREUM]: ['USDT', 'USDC', 'DAI', 'WETH', 'WBTC'],
  [ChainId.BNB]: ['BUSD', 'USDT', 'USDC', 'WBNB', 'ETH'],
  [ChainId.SOLANA]: ['USDC', 'USDT', 'SOL', 'ETH']
};

export async function getTokensForChain(chainId: ChainId): Promise<TokenInfo[]> {
  try {
    // First try to get tokens from our database
    const { data: tokens, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .order('is_popular', { ascending: false });

    if (error) {
      console.error('Error fetching tokens from database:', error);
      return DEFAULT_TOKENS[chainId] || [];
    }

    if (tokens && tokens.length > 0) {
      return tokens.map(token => ({
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals || 18,
        chainId: token.chain_id,
        logoURI: token.logo_uri
      }));
    }

    // If no tokens in database, trigger sync
    await supabase.functions.invoke('sync-tokens', {
      body: { chainId }
    });

    // Return defaults while sync is running
    return DEFAULT_TOKENS[chainId] || [];
  } catch (error) {
    console.error('Error in getTokensForChain:', error);
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
      popularSymbols = ['ETH', 'WETH', 'USDT', 'USDC', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE'];
      break;
    case ChainId.BNB:
      popularSymbols = ['BNB', 'WBNB', 'BUSD', 'USDT', 'USDC', 'CAKE', 'ETH'];
      break;
    case ChainId.SOLANA:
      popularSymbols = ['SOL', 'USDC', 'USDT', 'BONK', 'JUP', 'RAY', 'ORCA'];
      break;
    default:
      popularSymbols = ['ETH', 'WETH', 'USDT', 'USDC'];
  }

  try {
    // Filter tokens that match popular symbols
    const popularTokens = allTokens.filter(token => 
      token.symbol && popularSymbols.includes(token.symbol)
    );
    
    // If no popular tokens found, fall back to defaults
    if (popularTokens.length === 0) {
      return DEFAULT_TOKENS[chainId] || [];
    }
    
    // Sort by the order in popularSymbols
    return popularTokens.sort((a, b) => {
      const aIndex = popularSymbols.indexOf(a.symbol || '');
      const bIndex = popularSymbols.indexOf(b.symbol || '');
      return aIndex - bIndex;
    });
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
