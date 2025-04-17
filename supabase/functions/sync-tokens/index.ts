
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenData {
  address: string
  symbol: string
  name: string
  chainId: number
  decimals?: number
  logoURI?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { chainId } = await req.json()

    let tokenList: TokenData[] = []

    // Fetch tokens based on chain
    if (chainId === 1) { // Ethereum
      const response = await fetch('https://tokens.coingecko.com/uniswap/all.json')
      const data = await response.json()
      tokenList = data.tokens.filter((t: any) => t.chainId === 1)
    } else if (chainId === 56) { // BSC
      const response = await fetch('https://tokens.pancakeswap.finance/pancakeswap-extended.json')
      const data = await response.json()
      tokenList = data.tokens.filter((t: any) => t.chainId === 56)
    }

    // Batch insert/update tokens
    for (const token of tokenList) {
      const { data: existingToken } = await supabase
        .from('tokens')
        .select('id')
        .eq('address', token.address)
        .eq('chain_id', token.chainId)
        .single()

      if (existingToken) {
        // Update existing token
        await supabase
          .from('tokens')
          .update({
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals || 18,
            logo_uri: token.logoURI,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingToken.id)
      } else {
        // Insert new token
        await supabase
          .from('tokens')
          .insert({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            chain_id: token.chainId,
            decimals: token.decimals || 18,
            logo_uri: token.logoURI
          })
      }
    }

    // Update token prices using 1inch API
    for (const token of tokenList.slice(0, 50)) { // Limit to 50 tokens per run to avoid rate limits
      try {
        const priceUrl = `https://api.1inch.io/v5.0/${chainId}/quote?` +
          `fromTokenAddress=${token.address}&` +
          `toTokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7&` + // USDT
          `amount=1000000000000000000` // 1 token in wei

        const priceResponse = await fetch(priceUrl)
        if (priceResponse.ok) {
          const priceData = await priceResponse.json()
          const price = Number(priceData.toTokenAmount) / 1e6 // Convert from USDT decimals

          // Insert price data
          await supabase
            .from('token_prices')
            .insert({
              token_id: token.id,
              price_usd: price,
              source: '1inch'
            })

          // Update current price in tokens table
          await supabase
            .from('tokens')
            .update({ price_usd: price, last_updated: new Date().toISOString() })
            .eq('address', token.address)
            .eq('chain_id', token.chainId)
        }
      } catch (error) {
        console.error(`Failed to fetch price for token ${token.symbol}:`, error)
      }
    }

    return new Response(JSON.stringify({
      message: `Successfully synced ${tokenList.length} tokens for chain ${chainId}`,
      count: tokenList.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error syncing tokens:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
