
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

    // Initialize adapters with properly configured API keys
    const adapters = [];
    
    // Use chainId to determine which adapters to use
    if (baseToken.chainId === 101) { // Solana
      adapters.push(new JupiterAdapter());
    } else { // EVM chains
      // Get API key from environment variable
      const oneInchApiKey = Deno.env.get('ONEINCH_API_KEY');
      if (oneInchApiKey) {
        const oneInchAdapter = new OneInchAdapter();
        oneInchAdapter.setApiKey(oneInchApiKey);
        adapters.push(oneInchAdapter);
      } else {
        console.warn("ONEINCH_API_KEY not found in environment variables");
      }
      
      // Add additional EVM adapters here as needed
    }

    if (adapters.length === 0) {
      throw new Error(`No compatible price adapters available for chain ${baseToken.chainId}`);
    }

    console.log(`Fetching prices for ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);

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

    // Add fallback price from database if no live prices are available
    if (Object.keys(prices).length === 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0) {
        prices['historical'] = {
          source: 'historical',
          price: data[0].price,
          timestamp: new Date(data[0].timestamp).getTime(),
          liquidity: data[0].liquidity || 100000,
          isFallback: true
        };
      }
    }

    // Store new results in Supabase for historical data
    if (Object.keys(prices).length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const records = Object.entries(prices)
        .filter(([_, data]) => !data.isFallback) // Don't record fallback data
        .map(([dexName, data]) => ({
          token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
          dex_name: dexName,
          price: data.price,
          chain_id: baseToken.chainId,
          liquidity: data.liquidity,
          timestamp: new Date().toISOString()
        }));

      if (records.length > 0) {
        await supabase.from('dex_price_history').insert(records);
      }
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
