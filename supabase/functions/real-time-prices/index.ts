
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handler for CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
}

// Define supported DEXes for different chains
const DEX_CONFIGS = {
  // Ethereum (Chain ID: 1)
  1: ['uniswap', 'sushiswap', 'curve', 'balancer'],
  
  // BSC (Chain ID: 56)
  56: ['pancakeswap', 'sushiswap'],
  
  // Solana (Chain ID: 101)
  101: ['jupiter', 'raydium', 'orca'],
  
  // Base (Chain ID: 8453)
  8453: ['uniswap', 'pancakeswap'],
  
  // Polygon (Chain ID: 137)
  137: ['uniswap', 'sushiswap', 'quickswap'],
  
  // Arbitrum (Chain ID: 42161)
  42161: ['uniswap', 'sushiswap'],
  
  // Optimism (Chain ID: 10)
  10: ['uniswap', 'sushiswap'],
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { baseToken, quoteToken } = await req.json();
    
    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token information' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const chainId = baseToken.chainId;
    
    if (!DEX_CONFIGS[chainId]) {
      return new Response(
        JSON.stringify({ error: `Chain ID ${chainId} not supported` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Call the fetch-prices function which has all the detailed implementations
    const { data: priceData, error } = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-prices`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` 
        },
        body: JSON.stringify({ baseToken, quoteToken })
      }
    ).then(res => res.json());
    
    if (error) {
      throw new Error(error);
    }

    return new Response(
      JSON.stringify(priceData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in real-time-prices function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
