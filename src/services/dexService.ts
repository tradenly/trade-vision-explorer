
import { TokenInfo } from './tokenListService';

export interface PriceQuote {
  dexName: string;
  price: number;
  fees: number; // in percentage
}

export interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  gasFee: number;
  tradingFees: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  network: string;
}

const DEX_TRADING_FEES: Record<string, number> = {
  uniswap: 0.3,    // 0.3%
  sushiswap: 0.3,  // 0.3%
  balancer: 0.2,   // 0.2%
  curve: 0.04,     // 0.04%
  pancakeswap: 0.25, // 0.25%
  jupiter: 0.2,    // 0.2%
  orca: 0.25,      // 0.25%
  raydium: 0.25    // 0.25%
};

const GAS_FEES: Record<string, number> = {
  ethereum: 5,     // $5 (approximate)
  bnb: 0.25,       // $0.25
  solana: 0.00025  // $0.00025
};

// Simulate fetching quotes from different DEXs
async function fetchQuote(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  dexName: string,
  amount: number = 1
): Promise<PriceQuote> {
  // In a real implementation, this would call the DEX's API or SDK
  // For now, we'll simulate the price data with random variations
  
  // Base price simulation (in production this would come from actual API calls)
  const basePrice = baseToken.symbol === 'ETH' 
    ? 3000 + Math.random() * 100 
    : baseToken.symbol === 'BNB' 
      ? 500 + Math.random() * 20
      : 100 + Math.random() * 10;
  
  // Simulate price variations between DEXs (within 5%)
  const variation = 0.95 + Math.random() * 0.1; // 0.95 - 1.05
  
  return {
    dexName,
    price: basePrice * variation,
    fees: DEX_TRADING_FEES[dexName.toLowerCase()] || 0.3
  };
}

// Get quotes from all supported DEXs for a chain
export async function getQuotesForChain(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  chainId: number
): Promise<PriceQuote[]> {
  let dexes: string[] = [];
  
  // Determine which DEXs to query based on chain
  if (chainId === 1) { // Ethereum
    dexes = ['Uniswap', 'SushiSwap', 'Balancer', 'Curve'];
  } else if (chainId === 56) { // BNB Chain
    dexes = ['PancakeSwap'];
  } else if (chainId === 101) { // Solana
    dexes = ['Jupiter', 'Orca', 'Raydium'];
  }
  
  // Fetch quotes from all relevant DEXs
  const quotePromises = dexes.map(dex => fetchQuote(baseToken, quoteToken, dex));
  return await Promise.all(quotePromises);
}

// Calculate the arbitrage opportunities based on quotes
export function calculateArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  quotes: PriceQuote[],
  investmentAmount: number = 1000 // Default $1000 investment
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const networkName = baseToken.chainId === 1 ? 'ethereum' : 
                      baseToken.chainId === 56 ? 'bnb' : 'solana';
  const gasFee = GAS_FEES[networkName];
  
  // Compare each DEX pair for arbitrage
  for (let i = 0; i < quotes.length; i++) {
    for (let j = 0; j < quotes.length; j++) {
      if (i === j) continue;
      
      const buyDex = quotes[i];
      const sellDex = quotes[j];
      
      // Calculate price difference
      if (sellDex.price > buyDex.price) {
        // Calculate fees
        const tradingFeeBuy = investmentAmount * (buyDex.fees / 100);
        const amountAfterBuy = (investmentAmount - tradingFeeBuy) / buyDex.price;
        const tradingFeeSell = amountAfterBuy * sellDex.price * (sellDex.fees / 100);
        const totalTradingFees = tradingFeeBuy + tradingFeeSell;
        
        // Calculate profit
        const grossProfit = (amountAfterBuy * sellDex.price) - investmentAmount;
        const netProfit = grossProfit - totalTradingFees - gasFee;
        const profitPercentage = (netProfit / investmentAmount) * 100;
        
        // Only include opportunities with positive profit
        if (netProfit > 0) {
          opportunities.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
            buyDex: buyDex.dexName,
            buyPrice: buyDex.price,
            sellDex: sellDex.dexName,
            sellPrice: sellDex.price,
            gasFee,
            tradingFees: totalTradingFees,
            estimatedProfit: netProfit,
            estimatedProfitPercentage: profitPercentage,
            network: networkName
          });
        }
      }
    }
  }
  
  // Sort by profit percentage
  return opportunities.sort((a, b) => b.estimatedProfitPercentage - a.estimatedProfitPercentage);
}

// Main function to scan for arbitrage opportunities
export async function scanForArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  investmentAmount: number = 1000
): Promise<ArbitrageOpportunity[]> {
  try {
    // Get quotes from all relevant DEXs
    const quotes = await getQuotesForChain(baseToken, quoteToken, baseToken.chainId);
    
    // Calculate opportunities
    return calculateArbitrageOpportunities(baseToken, quoteToken, quotes, investmentAmount);
  } catch (error) {
    console.error('Error scanning for arbitrage opportunities:', error);
    return [];
  }
}
