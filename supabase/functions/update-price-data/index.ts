
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Commonly traded token pairs to track
const COMMON_TOKEN_PAIRS = [
  // Ethereum pairs
  { baseSymbol: "ETH", quoteSymbol: "USDT", chainId: 1 },
  { baseSymbol: "ETH", quoteSymbol: "USDC", chainId: 1 },
  { baseSymbol: "WBTC", quoteSymbol: "ETH", chainId: 1 },
  
  // BNB pairs
  { baseSymbol: "BNB", quoteSymbol: "BUSD", chainId: 56 },
  { baseSymbol: "BNB", quoteSymbol: "USDT", chainId: 56 },
  
  // Solana pairs
  { baseSymbol: "SOL", quoteSymbol: "USDC", chainId: 101 },
  { baseSymbol: "SOL", quoteSymbol: "USDT", chainId: 101 },
  { baseSymbol: "BONK", quoteSymbol: "USDC", chainId: 101 },
];

// Rate limiter for API calls
const apiCallTimestamps: Record<string, number[]> = {};

function checkRateLimit(api: string, maxCalls: number, timeWindowMs: number): boolean {
  const now = Date.now();
  const timestamps = apiCallTimestamps[api] || [];
  
  // Remove old timestamps
  const recentCalls = timestamps.filter(time => now - time < timeWindowMs);
  
  // Update timestamps list
  apiCallTimestamps[api] = recentCalls;
  
  // Check if we've hit the limit
  if (recentCalls.length >= maxCalls) {
    return false;
  }
  
  // Add current call
  apiCallTimestamps[api].push(now);
  return true;
}

// Simple wrapper to fetch token address by symbol
async function getTokenBySymbol(symbol: string, chainId: number) {
  try {
    const { data } = await supabase
      .from('tokens')
      .select('*')
      .eq('symbol', symbol)
      .eq('chain_id', chainId)
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0];
    }
    
    // For well-known tokens, provide fallback addresses when not in DB
    if (symbol === 'ETH' && chainId === 1) {
      return {
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        chainId: 1,
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH'
      };
    } else if (symbol === 'USDT' && chainId === 1) {
      return {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        chainId: 1,
        decimals: 6,
        name: 'Tether USD',
        symbol: 'USDT'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching token ${symbol} on chain ${chainId}:`, error);
    return null;
  }
}

// Fetch price from 1inch API for EVM chains
async function fetch1InchPrice(baseToken: any, quoteToken: any, chainId: number) {
  try {
    // Check rate limit (10 calls per minute)
    if (!checkRateLimit('1inch', 10, 60000)) {
      console.log('1inch API rate limit reached, skipping...');
      return null;
    }
    
    const response = await fetch(
      `https://api.1inch.io/v5.0/${chainId}/quote?fromTokenAddress=${baseToken.address}&toTokenAddress=${quoteToken.address}&amount=1000000000000000000`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const price = parseFloat(data.toTokenAmount) / parseFloat(data.fromTokenAmount);
    return price;
  } catch (error) {
    console.error('Error fetching 1inch price:', error);
    return null;
  }
}

// Fetch price from Jupiter API for Solana tokens
async function fetchJupiterPrice(baseToken: any, quoteToken: any) {
  try {
    // Check rate limit (3 calls per second)
    if (!checkRateLimit('jupiter', 3, 1000)) {
      console.log('Jupiter API rate limit reached, skipping...');
      return null;
    }
    
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=1000000&slippageBps=50`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const price = parseFloat(data.outAmount) / parseFloat(data.inAmount);
    return price;
  } catch (error) {
    console.error('Error fetching Jupiter price:', error);
    return null;
  }
}

// Fetch token price from an appropriate API based on chain
async function fetchTokenPrice(baseToken: any, quoteToken: any) {
  try {
    if (!baseToken || !quoteToken) {
      return null;
    }
    
    if (baseToken.chainId === 101) {
      return await fetchJupiterPrice(baseToken, quoteToken);
    } else {
      return await fetch1InchPrice(baseToken, quoteToken, baseToken.chainId);
    }
  } catch (error) {
    console.error('Error fetching token price:', error);
    return null;
  }
}

// Main function to update price data for common token pairs
async function updatePriceData() {
  console.log('Starting price data update...');
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  for (const pair of COMMON_TOKEN_PAIRS) {
    try {
      // Get token details
      const baseToken = await getTokenBySymbol(pair.baseSymbol, pair.chainId);
      const quoteToken = await getTokenBySymbol(pair.quoteSymbol, pair.chainId);
      
      if (!baseToken || !quoteToken) {
        console.log(`Skipping ${pair.baseSymbol}/${pair.quoteSymbol} - tokens not found`);
        results.skipped++;
        continue;
      }
      
      // Fetch price
      const price = await fetchTokenPrice(baseToken, quoteToken);
      
      if (!price) {
        console.log(`Failed to fetch price for ${pair.baseSymbol}/${pair.quoteSymbol}`);
        results.failed++;
        continue;
      }
      
      // Store in database
      const { error } = await supabase
        .from('price_data')
        .insert({
          token_pair: `${pair.baseSymbol}/${pair.quoteSymbol}`,
          price: price,
          source: pair.chainId === 101 ? 'jupiter' : '1inch'
        });
      
      if (error) {
        console.error(`Error storing price data for ${pair.baseSymbol}/${pair.quoteSymbol}:`, error);
        results.failed++;
      } else {
        console.log(`Successfully updated price for ${pair.baseSymbol}/${pair.quoteSymbol}: ${price}`);
        results.success++;
      }
    } catch (error) {
      console.error(`Error processing ${pair.baseSymbol}/${pair.quoteSymbol}:`, error);
      results.failed++;
    }
    
    // Add a small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // For manual invocation, accept parameters
    let isScheduled = false;
    
    if (req.method === "POST") {
      const body = await req.json();
      isScheduled = body.scheduled || false;
    }
    
    // Run the update
    const results = await updatePriceData();
    
    return new Response(JSON.stringify({
      message: `Price data updated: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`,
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error updating price data:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
