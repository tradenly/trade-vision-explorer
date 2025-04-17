
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define interfaces for our request and response objects
interface ArbitrageScanRequest {
  baseToken: any;
  quoteToken: any;
  investmentAmount: number;
  minProfitPercentage: number;
}

interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  liquidityBuy: number;
  liquiditySell: number;
  tradingFeeBuy: number;
  tradingFeeSell: number;
  gasFee: number;
  netProfit: number;
  profitPercentage: number;
  network: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Estimate chain-specific gas fees
function estimateGasFee(chainId: number): number {
  switch(chainId) {
    case 1: // Ethereum
      return 0.005; // $5 in gas
    case 56: // BSC
      return 0.0005; // $0.50 in gas
    case 137: // Polygon
      return 0.001; // $1 in gas
    case 42161: // Arbitrum
      return 0.0015; // $1.50 in gas
    case 10: // Optimism
      return 0.001; // $1 in gas
    case 8453: // Base
      return 0.001; // $1 in gas
    case 101: // Solana
      return 0.0001; // $0.10 in gas
    default:
      return 0.002; // Default gas estimate
  }
}

// Get network name from chain ID
function getNetworkFromChainId(chainId: number): string {
  switch(chainId) {
    case 1: return "ethereum";
    case 56: return "bnb";
    case 101: return "solana";
    case 137: return "polygon";
    case 42161: return "arbitrum";
    case 10: return "optimism";
    case 8453: return "base";
    default: return "unknown";
  }
}

// Fetch quotes from DEXes for the given token pair
async function fetchDexQuotes(baseToken: any, quoteToken: any): Promise<any[]> {
  try {
    // Get DEX price data from our cached data in Supabase
    const { data, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching DEX quotes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchDexQuotes:', error);
    return [];
  }
}

// Find arbitrage opportunities by comparing prices across DEXes
function findArbitrageOpportunities(
  quotes: any[], 
  baseToken: any, 
  quoteToken: any, 
  investmentAmount: number,
  minProfitPercentage: number
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const gasFee = estimateGasFee(baseToken.chainId);
  const processedPairs = new Set();
  
  // Group quotes by DEX
  const dexQuotes: Record<string, any> = {};
  quotes.forEach(quote => {
    if (!dexQuotes[quote.dex_name]) {
      dexQuotes[quote.dex_name] = quote;
    }
  });
  
  // Compare each DEX with every other DEX
  const dexNames = Object.keys(dexQuotes);
  
  for (let i = 0; i < dexNames.length; i++) {
    const buyDex = dexNames[i];
    const buyData = dexQuotes[buyDex];
    const buyPrice = buyData.price;
    
    for (let j = 0; j < dexNames.length; j++) {
      if (i === j) continue; // Skip same DEX
      
      const sellDex = dexNames[j];
      const sellData = dexQuotes[sellDex];
      const sellPrice = sellData.price;
      
      const pairKey = `${buyDex}-${sellDex}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      
      // Calculate potential profit
      if (sellPrice > buyPrice) {
        const buyAmount = investmentAmount / buyPrice;
        const tradingFeeBuy = investmentAmount * 0.003; // Assume 0.3% trading fee
        const tradingFeeSell = sellPrice * buyAmount * 0.003;
        
        const sellAmount = buyAmount * sellPrice;
        const grossProfit = sellAmount - investmentAmount;
        const netProfit = grossProfit - gasFee - tradingFeeBuy - tradingFeeSell;
        const profitPercentage = (netProfit / investmentAmount) * 100;
        
        // Check if profit meets minimum threshold
        if (profitPercentage >= minProfitPercentage) {
          // Define reasonable liquidity values (these would normally come from the DEXes)
          const liquidityBuy = buyData.liquidityUSD || 100000;
          const liquiditySell = sellData.liquidityUSD || 100000;
          
          opportunities.push({
            id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
            buyDex,
            sellDex,
            buyPrice,
            sellPrice,
            liquidityBuy,
            liquiditySell,
            tradingFeeBuy,
            tradingFeeSell,
            gasFee,
            netProfit,
            profitPercentage,
            network: getNetworkFromChainId(baseToken.chainId)
          });
        }
      }
    }
  }
  
  // Sort opportunities by profit percentage (highest first)
  return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
}

// Main function to scan for arbitrage opportunities
async function scanForArbitrageOpportunities(
  baseToken: any, 
  quoteToken: any,
  investmentAmount: number,
  minProfitPercentage: number
): Promise<ArbitrageOpportunity[]> {
  try {
    // Fetch quotes from DEXes
    const quotes = await fetchDexQuotes(baseToken, quoteToken);
    
    if (!quotes.length) {
      console.log('No quotes found for', baseToken.symbol, quoteToken.symbol);
      return [];
    }
    
    // Find arbitrage opportunities
    const opportunities = findArbitrageOpportunities(
      quotes, 
      baseToken, 
      quoteToken, 
      investmentAmount,
      minProfitPercentage
    );
    
    // Store opportunities in the database for tracking
    if (opportunities.length > 0) {
      for (const opp of opportunities) {
        await supabase.from('arbitrage_opportunities').upsert({
          network: opp.network,
          token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
          buy_exchange: opp.buyDex,
          sell_exchange: opp.sellDex,
          price_diff: opp.sellPrice - opp.buyPrice,
          estimated_profit: opp.netProfit.toFixed(2),
          risk: opp.profitPercentage < 1 ? 'high' : opp.profitPercentage < 3 ? 'medium' : 'low',
          status: 'active'
        }, { onConflict: 'token_pair, buy_exchange, sell_exchange' });
      }
    }
    
    return opportunities;
  } catch (error) {
    console.error('Error scanning for arbitrage:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, investmentAmount = 1000, minProfitPercentage = 0.5 } = await req.json() as ArbitrageScanRequest;
    
    if (!baseToken || !quoteToken) {
      return new Response(JSON.stringify({ error: "Missing token information" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);
    
    // Scan for arbitrage opportunities
    const opportunities = await scanForArbitrageOpportunities(
      baseToken, 
      quoteToken, 
      investmentAmount,
      minProfitPercentage
    );
    
    console.log(`Found ${opportunities.length} arbitrage opportunities`);
    
    return new Response(JSON.stringify({ opportunities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
