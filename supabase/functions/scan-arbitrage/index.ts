
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
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
  investmentAmount: number;
  timestamp: number;
  totalFees: number;
  netProfit: number;
  tradeFee: number;
  gasFee: number;
  platformFee: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { baseToken, quoteToken, minProfitPercentage = 0.5, investmentAmount = 1000 } = await req.json()

    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
      )
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
    )
  } catch (error) {
    console.error('Error in scan-arbitrage function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Fetch prices from all available DEXes
async function fetchAllDexPrices(baseToken: TokenInfo, quoteToken: TokenInfo): Promise<Record<string, any>> {
  try {
    // Initialize Supabase client to store price data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
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
    
    // Store prices in the database for historical analysis
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
    const timestamp = new Date().toISOString();
    
    for (const [dexName, priceData] of Object.entries(prices)) {
      await supabase.from('dex_price_history').insert({
        dex_name: dexName,
        token_pair: tokenPair,
        price: priceData.price,
        chain_id: baseToken.chainId,
        liquidity: priceData.liquidity || 1000000,
        timestamp
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
  
  // Trading fees for each DEX (in percentage)
  const tradingFees: Record<string, number> = {
    'uniswap': 0.003, // 0.3%
    'sushiswap': 0.003, // 0.3%
    'pancakeswap': 0.0025, // 0.25%
    'jupiter': 0.0035, // 0.35%
    'orca': 0.003, // 0.3%
    'raydium': 0.003, // 0.3%
    'curve': 0.0004, // 0.04%
    '1inch': 0.003, // 0.3%
    'coingecko': 0.003 // Default
  };
  
  // Gas estimates in USD for network transactions
  const gasEstimates: Record<number, number> = {
    1: 5, // Ethereum: $5
    56: 0.5, // BSC: $0.5
    101: 0.001 // Solana: $0.001
  };
  
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
      
      // Calculate fees
      const buyTradingFee = investmentAmount * (tradingFees[buyDex.toLowerCase()] || 0.003);
      const sellTokenAmount = (investmentAmount - buyTradingFee) / buyPrice;
      const sellTradingFee = sellTokenAmount * sellPrice * (tradingFees[sellDex.toLowerCase()] || 0.003);
      const gasFee = gasEstimates[baseToken.chainId] || 0;
      const platformFee = investmentAmount * platformFeePercentage;
      
      const totalFees = buyTradingFee + sellTradingFee + gasFee + platformFee;
      
      // Calculate profit
      const grossProfit = (sellTokenAmount * sellPrice) - investmentAmount;
      const netProfit = grossProfit - totalFees;
      const netProfitPercentage = (netProfit / investmentAmount) * 100;
      
      // Only include opportunities with sufficient profit
      if (netProfitPercentage >= minProfitPercentage) {
        opportunities.push({
          id: `${buyDex}-${sellDex}-${baseToken.symbol}-${quoteToken.symbol}`,
          buyDex,
          sellDex,
          buyPrice,
          sellPrice,
          priceDifferencePercentage,
          baseToken,
          quoteToken,
          tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
          network,
          estimatedProfit: grossProfit,
          investmentAmount,
          timestamp: Date.now(),
          totalFees,
          netProfit,
          tradeFee: buyTradingFee + sellTradingFee,
          gasFee,
          platformFee
        });
      }
    }
  }
  
  // Sort by net profit percentage (descending)
  return opportunities.sort((a, b) => b.netProfit - a.netProfit);
}

// Store opportunities in the database
async function storeOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    for (const opportunity of opportunities) {
      await supabase.from('arbitrage_opportunities').insert({
        network: opportunity.network,
        token_pair: opportunity.tokenPair,
        buy_exchange: opportunity.buyDex,
        sell_exchange: opportunity.sellDex,
        price_diff: opportunity.priceDifferencePercentage,
        estimated_profit: opportunity.netProfit.toString(),
        risk: opportunity.netProfit > 10 ? 'low' : opportunity.netProfit > 5 ? 'medium' : 'high'
      });
    }
  } catch (error) {
    console.error('Error storing opportunities:', error);
  }
}
