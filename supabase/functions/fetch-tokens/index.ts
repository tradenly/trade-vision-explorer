
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define token interfaces
interface TokenInfo {
  address: string
  chainId: number
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { chainId } = await req.json()

    if (!chainId) {
      return new Response(
        JSON.stringify({ error: 'Missing chainId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if we have cached tokens in the database first
    const { data: cachedTokens, error: cachedError } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .is('is_verified', true)
      .limit(100)
    
    // Return cached tokens if available and recent
    if (!cachedError && cachedTokens && cachedTokens.length > 0) {
      console.log(`Found ${cachedTokens.length} cached tokens for chain ${chainId}`)
      return new Response(
        JSON.stringify({ tokens: cachedTokens }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch from external sources if cached data not available
    let tokens: TokenInfo[] = []

    if (chainId === 1) { // Ethereum
      const response = await fetch('https://tokens.coingecko.com/uniswap/all.json')
      const data = await response.json()
      tokens = data.tokens.filter((t: any) => t.chainId === 1)
    } 
    else if (chainId === 56) { // BSC
      const response = await fetch('https://tokens.pancakeswap.finance/pancakeswap-extended.json')
      const data = await response.json()
      tokens = data.tokens.filter((t: any) => t.chainId === 56)
    }
    else if (chainId === 101) { // Solana
      // For Solana, we'll use the default token list as a backup
      tokens = [
        { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9, chainId: 101 },
        { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, chainId: 101 },
        { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, chainId: 101 },
        { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, chainId: 101 },
        { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, chainId: 101 }
      ]
    }
    else if (chainId === 137) { // Polygon
      const response = await fetch('https://unpkg.com/@0xsequence/token-list@1/dist/tokens.polygon.json')
      const data = await response.json()
      tokens = data.tokens
    }
    else if (chainId === 42161) { // Arbitrum
      const response = await fetch('https://tokens.coingecko.com/arbitrum-one/all.json')
      const data = await response.json()
      tokens = data.tokens
    }
    else if (chainId === 8453) { // Base
      const response = await fetch('https://raw.githubusercontent.com/base-org/token-list/main/lists/base.tokenlist.json')
      const data = await response.json()
      tokens = data.tokens
    }

    // Filter and clean token data
    tokens = tokens
      .filter(token => 
        token.symbol && 
        token.name && 
        token.address &&
        token.decimals !== undefined
      )
      .map(token => ({
        address: token.address,
        chainId: token.chainId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logoURI: token.logoURI || null
      }));

    // Save tokens to database for future use
    if (tokens.length > 0) {
      for (const token of tokens.slice(0, 100)) { // Limit to 100 tokens to avoid timeout
        const { error } = await supabase
          .from('tokens')
          .upsert({
            address: token.address,
            chain_id: token.chainId,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logo_uri: token.logoURI,
            is_verified: true,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'address, chain_id'
          });
        
        if (error) {
          console.error('Error inserting token:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ tokens }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in fetch-tokens function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
