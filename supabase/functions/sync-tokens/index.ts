import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Token list sources for each chain
const TOKEN_SOURCES = {
  1: { // Ethereum
    url: 'https://gateway.ipfs.io/ipns/tokens.uniswap.org',
    format: 'uniswap'
  },
  56: { // BNB Chain
    url: 'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
    format: 'pancakeswap'
  },
  101: { // Solana
    url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json',
    format: 'solana'
  },
  8453: { // Base
    url: 'https://raw.githubusercontent.com/base-org/tokenlists/main/lists/base.tokenlist.json',
    format: 'uniswap'
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { chainId } = await req.json()

    if (!chainId || !TOKEN_SOURCES[chainId]) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unsupported chain ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const source = TOKEN_SOURCES[chainId]
    
    console.log(`Fetching tokens for chain ${chainId} from ${source.url}`);

    // Fetch token list from source
    const response = await fetch(source.url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.statusText}`)
    }

    const listData = await response.json()
    
    // Parse tokens based on format
    let tokens: any[] = []
    
    if (source.format === 'uniswap' || source.format === 'pancakeswap') {
      tokens = listData.tokens
        .filter((t: any) => t.chainId === chainId)
        .map((t: any) => ({
          address: t.address.toLowerCase(),
          chain_id: t.chainId,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          logo_uri: t.logoURI
        }))
    } else if (source.format === 'solana') {
      tokens = listData.tokens
        .filter((t: any) => t.chainId === 101) // 101 is Solana mainnet
        .map((t: any) => ({
          address: t.address,
          chain_id: 101,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          logo_uri: t.logoURI
        }))
    }

    // Filter duplicate tokens (keeping 1 per symbol)
    const uniqueTokens = new Map()
    tokens.forEach(token => {
      const key = `${token.symbol.toLowerCase()}`
      if (!uniqueTokens.has(key) || token.address.startsWith('0x')) {
        uniqueTokens.set(key, token)
      }
    })
    const filteredTokens = Array.from(uniqueTokens.values())

    // Insert tokens in batches to avoid timeout
    const BATCH_SIZE = 50
    for (let i = 0; i < filteredTokens.length; i += BATCH_SIZE) {
      const batch = filteredTokens.slice(i, i + BATCH_SIZE)
      
      // Upsert to update existing tokens or insert new ones
      const { error } = await supabase
        .from('tokens')
        .upsert(batch, { 
          onConflict: 'address, chain_id',
          ignoreDuplicates: false
        })
      
      if (error) {
        console.error(`Error upserting tokens batch ${i / BATCH_SIZE + 1}:`, error)
      } else {
        console.log(`Upserted batch ${i / BATCH_SIZE + 1} (${batch.length} tokens)`)
      }
      
      // Small delay between batches
      if (i + BATCH_SIZE < filteredTokens.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    return new Response(
      JSON.stringify({
        success: true, 
        message: `Successfully synced ${filteredTokens.length} tokens for chain ${chainId}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error syncing tokens:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
