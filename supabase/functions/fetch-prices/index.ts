
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { OneInchAdapter } from "./adapters/one-inch-adapter.ts"
import { JupiterAdapter } from "./adapters/jupiter-adapter.ts"
import { TokenPair } from "./types.ts"
import { PriceValidation } from "./utils/price-validation.ts"

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION = 30000; // 30 seconds
const priceCache = new Map();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken } = await req.json();
    
    if (!baseToken?.address || !quoteToken?.address || !baseToken.chainId) {
      throw new Error('Missing token information');
    }

    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    const cachedData = priceCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize price adapters based on chain
    const adapters = [];
    if (baseToken.chainId === 101) { // Solana
      adapters.push(new JupiterAdapter());
    } else { // EVM chains
      adapters.push(new OneInchAdapter());
    }

    // Fetch prices from all adapters
    const pricePromises = adapters.map(adapter => 
      adapter.getPrice(baseToken.address, quoteToken.address, baseToken.chainId)
    );

    const results = await Promise.allSettled(pricePromises);
    const prices = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const quote = result.value;
        
        // Validate the price quote
        const isValid = PriceValidation.validateQuote({
          dexName: adapters[index].getName(),
          price: quote.price,
          liquidityUSD: quote.liquidity,
          timestamp: quote.timestamp
        });
        
        if (isValid) {
          prices[adapters[index].getName()] = quote;
        }
      }
    });

    // Store results in Supabase for historical data
    if (Object.keys(prices).length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const records = Object.entries(prices).map(([dexName, data]) => ({
        token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
        dex_name: dexName,
        price: data.price,
        chain_id: baseToken.chainId,
        liquidity: data.liquidity,
        timestamp: new Date().toISOString()
      }));

      await supabase.from('dex_price_history').insert(records);
    }

    // Update cache
    const responseData = { prices, timestamp: Date.now() };
    priceCache.set(cacheKey, responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in fetch-prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
