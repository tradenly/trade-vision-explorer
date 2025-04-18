import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { PriceQuote } from './dex/types';
import DexRegistry from './dex/DexRegistry';
import { PriceAggregationService } from './dex/services/PriceAggregationService';
import { GasEstimationService } from './dex/services/GasEstimationService';
import { fetchAndStorePriceData } from './arbitrage/PriceDataService';
import { getNetworkName } from './arbitrage/utils';
import { storeArbitrageOpportunities } from './arbitrage/OpportunityStorageService';

interface ScanResult {
  opportunities: ArbitrageOpportunity[];
  errors: string[];
}

export async function scanArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
): Promise<ScanResult> {
  const errors: string[] = [];
  const opportunities: ArbitrageOpportunity[] = [];

  try {
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol}`);

    // Try direct edge function call first
    try {
      const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
        body: { 
          baseToken, 
          quoteToken, 
          minProfitPercentage,
          investmentAmount 
        }
      });

      if (error) throw error;

      if (data.opportunities && data.opportunities.length > 0) {
        console.log(`Found ${data.opportunities.length} opportunities via edge function`);
        return { opportunities: data.opportunities, errors: [] };
      }
      
      console.log('No opportunities found via edge function, falling back to client-side processing');
    } catch (edgeFnError) {
      console.warn('Edge function call failed, falling back to client-side processing:', edgeFnError);
    }

    // Fallback to client-side processing
    const priceQuotes = await fetchAndStorePriceData(baseToken, quoteToken);
    
    if (Object.keys(priceQuotes).length < 2) {
      return {
        opportunities: [],
        errors: ['Not enough price quotes available for arbitrage']
      };
    }

    console.log(`Got ${Object.keys(priceQuotes).length} price quotes for comparison`);

    // Get network name and gas estimates
    const networkName = getNetworkName(baseToken.chainId);
    const gasEstimationService = GasEstimationService.getInstance();
    const gasEstimate = await gasEstimationService.getOperationGasEstimate(networkName, 'swap');
    const approvalGasEstimate = await gasEstimationService.getOperationGasEstimate(networkName, 'approval');

    // Compare prices between DEXes
    const foundOpportunities = await findArbitrageOpportunities(
      priceQuotes,
      baseToken,
      quoteToken,
      minProfitPercentage,
      investmentAmount,
      networkName,
      gasEstimate,
      approvalGasEstimate
    );

    if (foundOpportunities.length > 0) {
      await storeArbitrageOpportunities(foundOpportunities);
    }

    return { opportunities: foundOpportunities, errors };
  } catch (error) {
    console.error('Error in scanArbitrageOpportunities:', error);
    return {
      opportunities: [],
      errors: ['Failed to scan for arbitrage opportunities']
    };
  }
}

async function findArbitrageOpportunities(
  priceQuotes: Record<string, PriceQuote>,
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number,
  investmentAmount: number,
  networkName: string,
  gasEstimate: number,
  approvalGasEstimate: number
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];

  const dexNames = Object.keys(priceQuotes);
  for (let i = 0; i < dexNames.length; i++) {
    for (let j = i + 1; j < dexNames.length; j++) {
      const dex1 = dexNames[i];
      const dex2 = dexNames[j];
      const quote1 = priceQuotes[dex1];
      const quote2 = priceQuotes[dex2];

      if (!quote1 || !quote2) continue;

      // Determine buy/sell direction by comparing prices
      let buyDex, sellDex, buyPrice, sellPrice, buyQuote, sellQuote;
      
      if (quote1.price < quote2.price) {
        buyDex = dex1;
        sellDex = dex2;
        buyPrice = quote1.price;
        sellPrice = quote2.price;
        buyQuote = quote1;
        sellQuote = quote2;
      } else {
        buyDex = dex2;
        sellDex = dex1;
        buyPrice = quote2.price;
        sellPrice = quote1.price;
        buyQuote = quote2;
        sellQuote = quote1;
      }

      const priceDiff = Math.abs(buyPrice - sellPrice);
      const avgPrice = (buyPrice + sellPrice) / 2;
      const priceDifferencePercentage = (priceDiff / avgPrice) * 100;

      // Check if price difference meets minimum threshold
      if (priceDifferencePercentage >= minProfitPercentage) {
        
        // Calculate fees and estimate slippage based on available liquidity
        const buyFee = (buyQuote.fees || 0.003) * investmentAmount;
        const sellFee = (sellQuote.fees || 0.003) * investmentAmount;
        
        // Calculate amount of tokens we'd get from the buy (accounting for slippage)
        const buyLiquidity = buyQuote.liquidityUSD || 1000000;
        const sellLiquidity = sellQuote.liquidityUSD || 1000000;
        
        // Calculate price impact
        const buyPriceImpact = Math.min((investmentAmount / buyLiquidity) * 100, 5) / 100;
        const sellPriceImpact = Math.min((investmentAmount / sellLiquidity) * 100, 5) / 100;
        
        // Calculate the effective price with slippage
        const effectiveBuyPrice = buyPrice * (1 + buyPriceImpact);
        const effectiveSellPrice = sellPrice * (1 - sellPriceImpact);
        
        // Check if the trade is still profitable after slippage
        const estimatedTokenAmount = investmentAmount / effectiveBuyPrice;
        const sellAmount = estimatedTokenAmount * effectiveSellPrice;
        
        // Calculate estimated profit and fees
        const estimatedProfit = sellAmount - investmentAmount;
        const tradingFees = buyFee + sellFee;
        const totalGasFee = gasEstimate + approvalGasEstimate;
        
        // Add platform fee (0.5% of investment)
        const platformFee = investmentAmount * 0.005;
        
        // Calculate net profit
        const netProfit = estimatedProfit - tradingFees - totalGasFee - platformFee;
        const netProfitPercentage = (netProfit / investmentAmount) * 100;
        
        // Check if still profitable
        if (netProfit > 0) {
          // Check if there's enough liquidity
          const minRequiredLiquidity = investmentAmount * 3; // At least 3x the investment
          
          if (buyLiquidity >= minRequiredLiquidity && sellLiquidity >= minRequiredLiquidity) {
            // Create opportunity
            const opportunity: ArbitrageOpportunity = {
              id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
              tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
              token: baseToken.symbol,
              network: networkName,
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              priceDifferencePercentage,
              liquidity: Math.min(buyLiquidity, sellLiquidity),
              estimatedProfit,
              estimatedProfitPercentage: priceDifferencePercentage,
              gasFee: totalGasFee,
              netProfit,
              netProfitPercentage,
              baseToken,
              quoteToken,
              timestamp: Date.now(),
              buyGasFee: gasEstimate,
              sellGasFee: approvalGasEstimate,
              tradingFees,
              platformFee,
              investmentAmount
            };

            opportunities.push(opportunity);
            console.log(`Found opportunity: ${buyDex}->${sellDex}, net profit: $${netProfit.toFixed(2)} (${netProfitPercentage.toFixed(2)}%)`);
          } else {
            console.log(`Skipping opportunity due to insufficient liquidity: ${buyDex}->${sellDex}, buyLiq: $${buyLiquidity}, sellLiq: $${sellLiquidity}`);
          }
        }
      }
    }
  }

  return opportunities;
}
