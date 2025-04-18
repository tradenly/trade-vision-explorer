
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
    const { pairs } = await req.json()
    const priceAggregator = new PriceAggregator()
    const results: Record<string, any> = {}

    // Process pairs in batches to avoid rate limits
    const batchSize = 3
    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (pair: TokenPair) => {
          const prices = await priceAggregator.getPrices(pair)
          const key = `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`
          results[key] = prices
        })
      )

      // Add delay between batches
      if (i + batchSize < pairs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Store results in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date().toISOString()
    const priceData = Object.entries(results).flatMap(([pair, dexPrices]) =>
      Object.entries(dexPrices).map(([dex, data]: [string, any]) => ({
        token_pair: pair,
        dex_name: dex,
        price: data.price,
        liquidity: data.liquidity,
        chain_id: pairs[0].chainId,
        timestamp: now
      }))
    )

    if (priceData.length > 0) {
      const { error } = await supabase
        .from('dex_price_history')
        .insert(priceData)

      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
