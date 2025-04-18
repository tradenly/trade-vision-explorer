
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PriceAggregator } from "./price-aggregator.ts"
import { TokenPair } from "./types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { baseToken, quoteToken } = await req.json()
    
    if (!baseToken || !quoteToken) {
      throw new Error('Missing token information')
    }
    
    // Create token pair for price aggregation
    const pair: TokenPair = {
      baseToken: {
        address: baseToken.address,
        symbol: baseToken.symbol,
        decimals: baseToken.decimals || 18
      },
      quoteToken: {
        address: quoteToken.address,
        symbol: quoteToken.symbol,
        decimals: quoteToken.decimals || 18
      },
      chainId: baseToken.chainId
    }
    
    console.log(`Fetching prices for ${pair.baseToken.symbol}/${pair.quoteToken.symbol} on chain ${pair.chainId}`);
    
    const priceAggregator = new PriceAggregator()
    const prices = await priceAggregator.getPrices(pair)
    
    // Store results in database for historical data
    if (Object.keys(prices).length > 0) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const now = new Date().toISOString()
        
        // Prepare records for database insertion
        const records = Object.entries(prices).map(([dexName, data]) => ({
          token_pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
          dex_name: dexName,
          price: data.price,
          liquidity: data.liquidity,
          chain_id: pair.chainId,
          timestamp: now
        }))

        // Insert into price history table
        const { error } = await supabase
          .from('dex_price_history')
          .insert(records)

        if (error) {
          console.error('Error storing price data:', error)
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Continue execution even if database storage fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        prices 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
