
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
}

interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  priceDifferencePercentage: number;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  tokenPair: string;
  network: string;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  investmentAmount: number;
  timestamp: number;
  tradingFees: number;
  gasFee: number;
  buyGasFee: number;
  sellGasFee: number;
  platformFee: number;
  netProfit: number;
  netProfitPercentage: number;
  liquidity: number;
  buyPriceImpact: number;
  sellPriceImpact: number;
  adjustedBuyPrice: number;
  adjustedSellPrice: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, minProfitPercentage = 0.5, investmentAmount = 1000 } = await req.json();

    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol}`);
    
    // First, fetch prices from all DEXes
    const priceData = await fetchAllDexPrices(baseToken, quoteToken);
    
    if (Object.keys(priceData).length < 2) {
      return new Response(
        JSON.stringify({ 
          prices: priceData, 
          opportunities: [],
          message: 'Not enough DEXes with price data for arbitrage' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find opportunities
    const opportunities = findArbitrageOpportunities(
      priceData,
      baseToken,
      quoteToken,
      minProfitPercentage,
      investmentAmount
    );
    
    // Store opportunities in the database
    if (opportunities.length > 0) {
      await storeOpportunities(opportunities);
    }

    return new Response(
      JSON.stringify({
        prices: priceData,
        opportunities,
        count: opportunities.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in scan-arbitrage function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fetch prices from all available DEXes
async function fetchAllDexPrices(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, any>> {
  try {
    // Initialize Supabase client to store price data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get prices from edge function
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-prices`;
    console.log(`Fetching prices from ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ baseToken, quoteToken })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const prices = data.prices;
    
    // Get recent historical prices as backup/supplement
    const { data: recentPrices, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
      .eq('chain_id', baseToken.chainId)
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (!error && recentPrices && recentPrices.length > 0) {
      // Add any DEXes from history that aren't in the current data
      const processedDexes = new Set(Object.keys(prices));
      
      recentPrices.forEach(item => {
        if (!processedDexes.has(item.dex_name)) {
          processedDexes.add(item.dex_name);
          
          prices[item.dex_name] = {
            price: item.price,
            liquidity: item.liquidity || 100000,
            timestamp: new Date(item.timestamp).getTime(),
            tradingFee: getTradingFeeForDex(item.dex_name),
            isFallback: true
          };
        }
      });
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {};
  }
}

// Find arbitrage opportunities based on price differences
function findArbitrageOpportunities(
  prices: Record<string, any>,
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const dexNames = Object.keys(prices);
  
  // Platform fee (0.5%)
  const platformFeePercentage = 0.005;
  
  // Get network name
  const networkNames: Record<number, string> = {
    1: 'ethereum',
    56: 'bnb',
    101: 'solana'
  };
  const network = networkNames[baseToken.chainId] || 'unknown';
  
  // Compare prices across different DEXes
  for (let i = 0; i < dexNames.length; i++) {
    for (let j = 0; j < dexNames.length; j++) {
      if (i === j) continue;
      
      const buyDex = dexNames[i];
      const sellDex = dexNames[j];
      
      const buyPrice = prices[buyDex].price;
      const sellPrice = prices[sellDex].price;
      
      // Calculate price difference
      const priceDifferencePercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
      
      // Skip if the difference is too small
      if (priceDifferencePercentage <= minProfitPercentage) continue;
      
      // Calculate liquidity
      const buyLiquidity = prices[buyDex].liquidity || 100000;
      const sellLiquidity = prices[sellDex].liquidity || 100000;
      const minLiquidity = Math.min(buyLiquidity, sellLiquidity);
      
      // Calculate price impact based on investment and liquidity
      const buyPriceImpact = calculatePriceImpact(investmentAmount, buyLiquidity);
      const sellPriceImpact = calculatePriceImpact(investmentAmount, sellLiquidity);
      
      // Adjust prices based on price impact
      const adjustedBuyPrice = buyPrice * (1 + buyPriceImpact / 100);
      const adjustedSellPrice = sellPrice * (1 - sellPriceImpact / 100);
      
      // Check if still profitable after price impact
      if (adjustedSellPrice <= adjustedBuyPrice) continue;
      
      // Calculate fees
      const buyTradingFee = investmentAmount * (prices[buyDex].tradingFee || 0.003);
      const sellTradeAmount = investmentAmount - buyTradingFee;
      const sellTradingFee = sellTradeAmount * (prices[sellDex].tradingFee || 0.003);
      const totalTradingFees = buyTradingFee + sellTradingFee;
      
      // Get gas estimates
      const gasEstimate = getGasEstimateForChain(baseToken.chainId);
      const buyGasFee = gasEstimate / 2;
      const sellGasFee = gasEstimate / 2;
      const totalGasFee = buyGasFee + sellGasFee;
      
      // Calculate platform fee
      const platformFee = investmentAmount * platformFeePercentage;
      
      // Calculate profit
      const rawProfit = (sellTradeAmount - sellTradingFee) / buyPrice * (adjustedSellPrice - adjustedBuyPrice);
      const netProfit = rawProfit - totalGasFee - platformFee;
      const profitPercentage = (netProfit / investmentAmount) * 100;
      
      // Only include profitable opportunities
      if (netProfit > 0 && profitPercentage >= minProfitPercentage) {
        const opportunity: ArbitrageOpportunity = {
          id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
          buyDex,
          sellDex,
          buyPrice,
          sellPrice,
          priceDifferencePercentage,
          estimatedProfit: rawProfit,
          estimatedProfitPercentage: (rawProfit / investmentAmount) * 100,
          baseToken,
          quoteToken,
          tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
          network,
          investmentAmount,
          timestamp: Date.now(),
          tradingFees: totalTradingFees,
          gasFee: totalGasFee,
          buyGasFee,
          sellGasFee,
          platformFee,
          netProfit,
          netProfitPercentage: profitPercentage,
          liquidity: minLiquidity,
          buyPriceImpact,
          sellPriceImpact,
          adjustedBuyPrice,
          adjustedSellPrice
        };
        
        opportunities.push(opportunity);
      }
    }
  }
  
  // Sort by net profit percentage from highest to lowest
  return opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
}

// Store opportunities in the database
async function storeOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store each opportunity
    for (const opp of opportunities) {
      await supabase.from('arbitrage_opportunities').insert({
        base_token: opp.baseToken.symbol,
        quote_token: opp.quoteToken.symbol,
        buy_dex: opp.buyDex,
        sell_dex: opp.sellDex,
        buy_price: opp.buyPrice,
        sell_price: opp.sellPrice,
        price_difference_percentage: opp.priceDifferencePercentage,
        network: opp.network,
        chain_id: opp.baseToken.chainId,
        estimated_profit: opp.netProfit,
        profit_percentage: opp.netProfitPercentage,
        liquidity: opp.liquidity,
        timestamp: new Date().toISOString(),
        trading_fees: opp.tradingFees,
        gas_fees: opp.gasFee,
        platform_fee: opp.platformFee,
        opportunity_data: opp
      });
    }
  } catch (error) {
    console.error('Error storing opportunities:', error);
  }
}

// Helper function to calculate price impact based on investment and liquidity
function calculatePriceImpact(investmentAmount: number, liquidity: number): number {
  // Simple price impact model: impact is proportional to the ratio of trade size to liquidity
  // Impact is higher as the trade size approaches the liquidity
  const ratio = investmentAmount / liquidity;
  
  // Apply a scaling formula to make the impact realistic
  // For small trades (< 1% of liquidity), impact is minimal
  // For larger trades, impact grows non-linearly
  return Math.min(ratio * 100, 10); // Cap at 10% for safety
}

// Get trading fee for a specific DEX
function getTradingFeeForDex(dexName: string): number {
  const fees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    'curve': 0.0004, // 0.04%
    '1inch': 0.003 // 0.3%
  };
  
  return fees[dexName.toLowerCase()] || 0.003; // Default 0.3%
}

// Get gas price estimate for different chains
function getGasEstimateForChain(chainId: number): number {
  switch (chainId) {
    case 1: // Ethereum
      return 5; // $5 per transaction
    case 56: // BSC
      return 0.5; // $0.50 per transaction
    case 101: // Solana
      return 0.01; // $0.01 per transaction
    default:
      return 1; // $1 per transaction
  }
}
