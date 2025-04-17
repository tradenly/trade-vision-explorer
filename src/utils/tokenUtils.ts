
import { TokenInfo } from '@/services/tokenListService';

/**
 * Get the appropriate number of decimal places to display for a token
 * @param token The token to get decimal places for
 */
export function getTokenDisplayDecimals(symbol: string | undefined): number {
  if (!symbol) return 2;
  
  // Stable coins generally use 2 decimals for display
  if (['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD'].includes(symbol)) {
    return 2;
  }
  
  // ETH, BNB, SOL, etc. typically use 4 decimals
  if (['ETH', 'WETH', 'BNB', 'WBNB', 'SOL', 'AVAX', 'MATIC'].includes(symbol)) {
    return 4;
  }
  
  // Small value tokens like SHIB, BONK need more decimals
  if (['SHIB', 'BONK', 'SAMO', 'DOGE'].includes(symbol)) {
    return 8;
  }
  
  // Default for most tokens
  return 4;
}

/**
 * Format token price with appropriate decimals
 * @param price The price to format
 * @param symbol The token symbol
 */
export function formatTokenPrice(price: number, symbol?: string): string {
  const decimals = getTokenDisplayDecimals(symbol);
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format token amount with commas and appropriate decimals
 * @param amount The amount to format 
 * @param token The token info
 */
export function formatTokenAmount(amount: number, token?: TokenInfo): string {
  if (!token) return amount.toLocaleString();
  
  // Use the token's decimals, but limit to a reasonable display amount
  const displayDecimals = Math.min(token.decimals || 2, 8);
  
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals
  });
}

/**
 * Calculate the USD value of a token amount
 * @param amount Token amount
 * @param tokenPrice Price per token in USD
 */
export function calculateUsdValue(amount: number, tokenPrice: number): number {
  return amount * tokenPrice;
}

/**
 * Format a USD value
 * @param usdValue The USD value to format
 */
export function formatUsdValue(usdValue: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usdValue);
}
