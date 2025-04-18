
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache with 5 minute expiry
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { chainId } = await req.json()

    // Check cache first
    const cacheKey = `tokens-${chainId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Try database first
    const { data: dbTokens, error: dbError } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .is('is_verified', true)
      .limit(200)

    if (dbTokens && dbTokens.length > 0) {
      const response = { tokens: dbTokens, source: 'database' };
      cache.set(cacheKey, { data: response, timestamp: Date.now() });
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fallback to hardcoded defaults based on chain
    const defaultTokens = getDefaultTokens(chainId);
    const response = { tokens: defaultTokens, source: 'default' };
    
    // Store defaults in database for future use
    await supabase.from('tokens').upsert(
      defaultTokens.map(token => ({
        address: token.address,
        chain_id: token.chainId,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        is_verified: true,
        last_updated: new Date().toISOString()
      }))
    );

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in fetch-tokens function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getDefaultTokens(chainId: number) {
  const defaults: Record<number, any[]> = {
    1: [ // Ethereum
      { name: 'Ethereum', symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 1, decimals: 18 },
      { name: 'Wrapped Ether', symbol: 'WETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', chainId: 1, decimals: 18 },
      { name: 'USD Coin', symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chainId: 1, decimals: 6 },
      { name: 'Tether USD', symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', chainId: 1, decimals: 6 },
      { name: 'Dai Stablecoin', symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', chainId: 1, decimals: 18 },
    ],
    56: [ // BSC
      { name: 'BNB', symbol: 'BNB', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', chainId: 56, decimals: 18 },
      { name: 'Wrapped BNB', symbol: 'WBNB', address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', chainId: 56, decimals: 18 },
      { name: 'BUSD Token', symbol: 'BUSD', address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', chainId: 56, decimals: 18 },
      { name: 'USDT Token', symbol: 'USDT', address: '0x55d398326f99059ff775485246999027b3197955', chainId: 56, decimals: 18 },
    ],
    101: [ // Solana
      { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', chainId: 101, decimals: 9 },
      { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chainId: 101, decimals: 6 },
      { name: 'Tether USD', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chainId: 101, decimals: 6 },
      { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chainId: 101, decimals: 5 },
    ]
  };
  
  return defaults[chainId] || [];
}
