
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | string,
  currency = 'USD',
  locale = 'en-US'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function formatPercentage(
  value: number | string,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2
): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return '0.00%';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue / 100);
}

export function shortenAddress(
  address: string | undefined | null,
  startLength = 6,
  endLength = 4
): string {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  
  return `${address.substring(0, startLength)}...${address.substring(
    address.length - endLength
  )}`;
}

export function calculatePriceDifference(
  price1: number,
  price2: number
): { percentage: number; absolute: number } {
  const absolute = price2 - price1;
  const percentage = (absolute / price1) * 100;
  
  return { percentage, absolute };
}
