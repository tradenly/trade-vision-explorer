
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract request body
    const { tokenPairs = [], chainId } = await req.json();

    if (!tokenPairs.length) {
      return new Response(
        JSON.stringify({ error: 'No token pairs provided' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process token pairs in batches to avoid rate limits
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < tokenPairs.length; i += batchSize) {
      const batch = tokenPairs.slice(i, i + batchSize);
      const batchPromises = batch.map(async (pair: any) => {
        try {
          let prices = await fetchPricesForPair(pair.baseToken, pair.quoteToken, chainId);
          
          // Store in Supabase
          const entries = Object.entries(prices).map(([dexName, price]) => ({
            dex_name: dexName.toLowerCase(),
            token_pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
            chain_id: chainId || 1,
            price: price.price,
            timestamp: new Date().toISOString(),
            liquidity: price.liquidityUSD || 0
          }));

          if (entries.length > 0) {
            await supabase.from('dex_price_history').insert(entries);
          }
          
          return {
            tokenPair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
            success: true,
            prices: entries.length
          };
        } catch (error) {
          console.error(`Error fetching prices for ${pair.baseToken.symbol}/${pair.quoteToken.symbol}:`, error);
          return {
            tokenPair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add a delay between batches to respect rate limits
      if (i + batchSize < tokenPairs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in update-price-data function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchPricesForPair(baseToken: any, quoteToken: any, chainId: number) {
  const adapters = getDexAdapters(chainId);
  const prices: Record<string, any> = {};
  
  // Execute price fetches sequentially to avoid rate limits
  for (const adapter of adapters) {
    try {
      const quote = await adapter.fetchQuote(baseToken, quoteToken);
      prices[adapter.getName()] = quote;
    } catch (error) {
      console.error(`Error fetching ${adapter.getName()} price:`, error);
    }
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return prices;
}

function getDexAdapters(chainId: number): any[] {
  // Simplified adapter creation for the Edge Function
  // In production, you'd want to refactor this to share code with the frontend
  const adapters: any[] = [];
  
  switch (chainId) {
    case 1: // Ethereum
      adapters.push(
        createSimpleAdapter('Uniswap', 0.003),
        createSimpleAdapter('Sushiswap', 0.003),
        createSimpleAdapter('Curve', 0.0004),
        createSimpleAdapter('Balancer', 0.002)
      );
      break;
    case 56: // BSC
      adapters.push(
        createSimpleAdapter('PancakeSwap', 0.0025),
        createSimpleAdapter('Sushiswap', 0.003)
      );
      break;
    case 101: // Solana
      adapters.push(
        createSimpleAdapter('Jupiter', 0.0035),
        createSimpleAdapter('Orca', 0.003),
        createSimpleAdapter('Raydium', 0.003)
      );
      break;
    // Add more chains as needed
    default:
      adapters.push(createSimpleAdapter('Uniswap', 0.003));
  }
  
  return adapters;
}

function createSimpleAdapter(name: string, fee: number) {
  return {
    getName: () => name,
    fetchQuote: async (baseToken: any, quoteToken: any) => {
      // Simplified price fetching for the edge function
      // In real use, this would call respective APIs
      return {
        price: Math.random() * 100, // Mock price
        liquidityUSD: Math.random() * 1000000 + 100000,
        fees: fee
      };
    }
  };
}
