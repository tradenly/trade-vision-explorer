
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { DexAdapter } from './types.ts';
import { JupiterAdapter } from './jupiter-adapter.ts';
import { PancakeSwapAdapter } from './pancakeswap-adapter.ts';
import { UniswapAdapter } from './uniswap-adapter.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { baseToken, quoteToken } = await req.json();
    
    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching prices for ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);
    
    // Initialize Supabase client to store price data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Select appropriate adapters based on chain
    const adapters: DexAdapter[] = [];
    
    if (baseToken.chainId === 101) {
      // Solana adapters
      adapters.push(new JupiterAdapter());
    } else if (baseToken.chainId === 56) {
      // BNB Chain adapters
      adapters.push(new PancakeSwapAdapter());
    } else if (baseToken.chainId === 1) {
      // Ethereum adapters
      adapters.push(new UniswapAdapter());
    }
    
    // Fetch prices from all adapters in parallel
    const pricePromises = adapters.map(async (adapter) => {
      try {
        const result = await adapter.getPrice(
          baseToken.address,
          quoteToken.address,
          baseToken.chainId
        );
        
        if (result) {
          // Store price in database for historical analysis
          try {
            await supabase.from('dex_price_history').insert({
              dex_name: adapter.getName(),
              token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
              price: result.price,
              chain_id: baseToken.chainId,
              liquidity: result.liquidity,
              timestamp: new Date().toISOString()
            });
          } catch (dbError) {
            console.error(`Error saving price to database: ${dbError}`);
          }
          
          return { [adapter.getName()]: result };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching price from ${adapter.getName()}: ${error}`);
        return null;
      }
    });
    
    const results = await Promise.allSettled(pricePromises);
    
    // Combine all price data
    const prices = results.reduce((acc, result) => {
      if (result.status === 'fulfilled' && result.value) {
        return { ...acc, ...result.value };
      }
      return acc;
    }, {});
    
    // Return the combined price data
    return new Response(
      JSON.stringify({ prices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-prices function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
