
import { TokenInfo } from "@/services/tokenListService";
import { PriceQuote, TransactionStatus } from "./dex/types";
import DexRegistry from "./dex/DexRegistry";

export interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceDifferencePercentage: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  timestamp: number;
  buyGasFee: number;
  sellGasFee: number;
  tradingFees: number;
  platformFee: number;
  investmentAmount: number;
  netProfit: number;
  netProfitPercentage: number;
  // Add missing properties
  tokenPair: string;
  token: string;
  gasFee: number;
  liquidity: number;
  network: string;
  buyPriceImpact: number;
  sellPriceImpact: number;
  adjustedBuyPrice: number;
  adjustedSellPrice: number;
}

/**
 * Scans for arbitrage opportunities between different DEXs
 */
export async function scanForArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  investmentAmount: number,
  minProfitPercentage: number = 0.5
): Promise<ArbitrageOpportunity[]> {
  try {
    const dexRegistry = DexRegistry.getInstance();
    const dexQuotes = await dexRegistry.fetchLatestPricesForPair(baseToken, quoteToken);
    
    // Convert dexQuotes to an array for easier processing
    const dexArray = Object.entries(dexQuotes);

    const opportunities: ArbitrageOpportunity[] = [];

    // Iterate through all possible DEX pairs to find arbitrage opportunities
    for (let i = 0; i < dexArray.length; i++) {
      for (let j = i + 1; j < dexArray.length; j++) {
        const [buyDex, buyQuote] = dexArray[i];
        const [sellDex, sellQuote] = dexArray[j];

        if (!buyQuote || !sellQuote) {
          console.warn(`Skipping ${buyDex} vs ${sellDex} due to missing quotes`);
          continue;
        }

        const priceDifferencePercentage = calculatePriceDifference(buyQuote.price, sellQuote.price);

        // Check if there's a significant price difference
        if (Math.abs(priceDifferencePercentage) > 0.01) {
          const [buyPrice, sellPrice] =
            priceDifferencePercentage > 0
              ? [buyQuote.price, sellQuote.price] // buyDex is cheaper
              : [sellQuote.price, buyQuote.price]; // sellDex is cheaper

          const [cheaperDex, expensiveDex] =
            priceDifferencePercentage > 0
              ? [buyDex, sellDex] // buyDex is cheaper
              : [sellDex, buyDex]; // sellDex is cheaper

          const estimatedProfit = investmentAmount * (sellPrice - buyPrice);
          const estimatedProfitPercentage = (estimatedProfit / investmentAmount) * 100;

          // Calculate fees
          const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
          const platformFee = calculatePlatformFee(investmentAmount);
          const [buyGasFee, sellGasFee] = [0.5, 0.5]; // Mock gas fees
          const gasFee = buyGasFee + sellGasFee; // Combined gas fee

          const netProfit = estimatedProfit - tradingFees - platformFee - buyGasFee - sellGasFee;
          const netProfitPercentage = (netProfit / investmentAmount) * 100;

          // Determine network based on chain ID
          const network = baseToken.chainId === 1 ? 'ethereum' : 
                          baseToken.chainId === 56 ? 'bnb' : 
                          baseToken.chainId === 101 ? 'solana' : 'unknown';

          // Create token pair string
          const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;

          if (netProfitPercentage >= minProfitPercentage) {
            const opportunity: ArbitrageOpportunity = {
              id: generateOpportunityId(baseToken.symbol, quoteToken.symbol, cheaperDex, expensiveDex),
              buyDex: cheaperDex,
              sellDex: expensiveDex,
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              priceDifferencePercentage: priceDifferencePercentage,
              estimatedProfit: estimatedProfit,
              estimatedProfitPercentage: estimatedProfitPercentage,
              baseToken: baseToken,
              quoteToken: quoteToken,
              timestamp: Date.now(),
              buyGasFee: buyGasFee,
              sellGasFee: sellGasFee,
              tradingFees: tradingFees,
              platformFee: platformFee,
              investmentAmount: investmentAmount,
              netProfit: netProfit,
              netProfitPercentage: netProfitPercentage,
              // Add the missing properties
              tokenPair: tokenPair,
              token: baseToken.symbol,
              gasFee: gasFee,
              liquidity: buyQuote.liquidityUSD || sellQuote.liquidityUSD || investmentAmount * 100, // Use liquidityUSD instead of liquidity
              network: network,
              // Add new required properties
              buyPriceImpact: 0,
              sellPriceImpact: 0,
              adjustedBuyPrice: buyPrice,
              adjustedSellPrice: sellPrice
            };

            opportunities.push(opportunity);
          }
        }
      }
    }

    return opportunities;
  } catch (error) {
    console.error("Error scanning for arbitrage opportunities:", error);
    throw new Error("Failed to scan for arbitrage opportunities");
  }
}

/**
 * Mock function to execute a trade
 */
export async function executeTrade(opportunity: ArbitrageOpportunity): Promise<TransactionStatus> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate a successful trade
      resolve(TransactionStatus.SUCCESS);
    }, 3000);
  });
}

/**
 * Helper function to calculate the price difference between two DEXs
 */
function calculatePriceDifference(price1: number, price2: number): number {
  return ((price2 - price1) / price1) * 100;
}

/**
 * Helper function to calculate trading fees
 */
function calculateTradingFees(investmentAmount: number, dex1: string, dex2: string): number {
  // Mock trading fees calculation
  return investmentAmount * 0.003 * 2; // 0.3% fee for each DEX
}

/**
 * Helper function to calculate platform fee
 */
function calculatePlatformFee(investmentAmount: number): number {
  // Mock platform fee calculation
  return investmentAmount * 0.005; // 0.5% platform fee
}

/**
 * Helper function to generate a unique opportunity ID
 */
function generateOpportunityId(baseSymbol: string, quoteSymbol: string, dex1: string, dex2: string): string {
  return `${baseSymbol}-${quoteSymbol}-${dex1}-${dex2}-${Date.now()}`;
}
