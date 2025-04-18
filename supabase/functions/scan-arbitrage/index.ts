
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { scanArbitrageOpportunities } from "./arbitrage-scanner.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

interface ArbitrageRequest {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  minProfitPercentage?: number;
  investmentAmount?: number;
  maxAgeSeconds?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body and parse it
    const request: ArbitrageRequest = await req.json()

    // Validate the request
    if (!request.baseToken || !request.quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set defaults for optional parameters
    request.minProfitPercentage = request.minProfitPercentage || 0.5 // 0.5% minimum profit
    request.investmentAmount = request.investmentAmount || 1000 // $1000 investment
    request.maxAgeSeconds = request.maxAgeSeconds || 30 // 30 seconds max age for price data

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Make sure we have fresh price data
    await updatePriceData(supabase, request)

    // Scan for arbitrage opportunities
    const opportunities = await scanArbitrageOpportunities(supabase, request)

    // Log the results
    console.log(`Found ${opportunities.length} arbitrage opportunities`)

    return new Response(
      JSON.stringify({ opportunities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scan-arbitrage function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Update price data before scanning for arbitrage
 */
async function updatePriceData(
  supabase: ReturnType<typeof createClient>,
  request: ArbitrageRequest
): Promise<void> {
  const { baseToken, quoteToken } = request
  
  try {
    // Check if we have recent price data
    const minTimestamp = new Date(Date.now() - (request.maxAgeSeconds! * 1000)).toISOString()
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`
    
    const { data: recentPrices, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', tokenPair)
      .eq('chain_id', baseToken.chainId)
      .gt('timestamp', minTimestamp)
      
    if (error) {
      console.error('Error checking for recent prices:', error)
      throw error
    }
    
    // If we have at least 2 recent prices from different DEXes, we don't need to fetch new data
    if (recentPrices && recentPrices.length >= 2) {
      const uniqueDexes = new Set(recentPrices.map(p => p.dex_name))
      if (uniqueDexes.size >= 2) {
        console.log(`Using ${recentPrices.length} recent prices from ${uniqueDexes.size} DEXes`)
        return
      }
    }
    
    // We need to fetch new price data
    console.log(`Fetching fresh price data for ${tokenPair}`)
    
    // Get the DEX names based on the chain
    const dexNames = getDexNamesForChain(baseToken.chainId)
    
    // Call the real-time-prices edge function to fetch and store prices
    const { data, error: fetchError } = await supabase.functions.invoke('real-time-prices', {
      body: { baseToken, quoteToken, dexNames }
    })
    
    if (fetchError) {
      console.error('Error fetching real-time prices:', fetchError)
      throw fetchError
    }
    
    console.log(`Successfully fetched ${Object.keys(data?.prices || {}).length} prices`)
    
  } catch (error) {
    console.error('Error updating price data:', error)
    // Continue with the scan even if price update fails
  }
}

/**
 * Get list of DEX names for a specific chain
 */
function getDexNamesForChain(chainId: number): string[] {
  switch (chainId) {
    case 1: // Ethereum
      return ['uniswap', 'sushiswap', '1inch', 'curve']
    case 56: // BSC
      return ['pancakeswap', '1inch']
    case 101: // Solana
      return ['jupiter', 'orca', 'raydium']
    case 137: // Polygon
      return ['uniswap', 'sushiswap', '1inch', 'quickswap']
    default:
      return ['1inch'] // Fallback to 1inch for other chains
  }
}
