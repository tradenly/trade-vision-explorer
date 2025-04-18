import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with commas and decimal places
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null) return '0.00';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format a token price based on value and symbol
 */
export function formatTokenPrice(value: number, symbol?: string): string {
  if (isNaN(value) || value === null) return '0.00';
  
  // Use more decimal places for small values or specific tokens
  if (value < 0.01 || ['BTC', 'ETH', 'SOL', 'WBTC'].includes(symbol || '')) {
    return formatNumber(value, 6);
  } else if (value < 1) {
    return formatNumber(value, 4);
  } else {
    return formatNumber(value, 2);
  }
}
