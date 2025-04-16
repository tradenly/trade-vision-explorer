
import { TokenInfo } from './tokenListService';
import { supabase } from '@/lib/supabaseClient';

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

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
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

// Execute a trade for an arbitrage opportunity
export async function executeTrade(
  opportunity: ArbitrageOpportunity,
  walletAddress: string
): Promise<TradeResult> {
  try {
    console.log(`Executing trade for ${opportunity.tokenPair} on networks ${opportunity.network}`);
    console.log(`Buy on ${opportunity.buyDex} at ${opportunity.buyPrice}, sell on ${opportunity.sellDex} at ${opportunity.sellPrice}`);
    console.log(`Wallet address: ${walletAddress}`);
    
    // Simulate trade execution delay (1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // In a real implementation, this would use the appropriate DEX SDK:
    // - For EVM chains: ethers.js + DEX contract interactions
    // - For Solana: @solana/web3.js + DEX program instructions
    
    // Simulate success with 90% probability
    const isSuccess = Math.random() > 0.1;
    
    // Generate a mock transaction hash
    const mockTxHash = isSuccess ? 
      '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('') : 
      undefined;
      
    // Log the trade to Supabase
    await logTradeToSupabase({
      wallet_address: walletAddress,
      token_pair: opportunity.tokenPair,
      buy_dex: opportunity.buyDex, 
      sell_dex: opportunity.sellDex,
      buy_price: opportunity.buyPrice,
      sell_price: opportunity.sellPrice,
      profit: opportunity.estimatedProfit,
      network: opportunity.network,
      tx_hash: mockTxHash,
      status: isSuccess ? 'success' : 'failed',
      error: isSuccess ? null : 'Transaction rejected by user or failed',
    });
    
    if (!isSuccess) {
      return {
        success: false,
        error: 'Transaction failed or was rejected by the user'
      };
    }
    
    return {
      success: true,
      txHash: mockTxHash
    };
  } catch (error) {
    console.error('Error executing trade:', error);
    
    // Log the failed trade
    await logTradeToSupabase({
      wallet_address: walletAddress,
      token_pair: opportunity.tokenPair,
      buy_dex: opportunity.buyDex, 
      sell_dex: opportunity.sellDex,
      buy_price: opportunity.buyPrice,
      sell_price: opportunity.sellPrice,
      profit: opportunity.estimatedProfit,
      network: opportunity.network,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

// Log the trade to Supabase
async function logTradeToSupabase(tradeData: {
  wallet_address: string;
  token_pair: string;
  buy_dex: string;
  sell_dex: string;
  buy_price: number;
  sell_price: number;
  profit: number;
  network: string;
  tx_hash?: string;
  status: 'success' | 'failed' | 'error';
  error?: string | null;
}) {
  try {
    const { error } = await supabase
      .from('trading_activity')
      .insert({
        type: 'arbitrage',
        strategy: 'manual',
        token_pair: tradeData.token_pair,
        price: tradeData.buy_price,
        amount: tradeData.profit,
        status: tradeData.status === 'success' ? 'completed' : 'failed',
        tx_hash: tradeData.tx_hash,
        details: {
          buy_dex: tradeData.buy_dex,
          sell_dex: tradeData.sell_dex,
          buy_price: tradeData.buy_price,
          sell_price: tradeData.sell_price,
          wallet_address: tradeData.wallet_address,
          network: tradeData.network,
          error: tradeData.error
        }
      });

    if (error) {
      console.error('Error logging trade to Supabase:', error);
    }
  } catch (error) {
    console.error('Error logging trade to Supabase:', error);
  }
}
