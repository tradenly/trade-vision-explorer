
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache for 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRY = 300000; // 5 minutes

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

    // Check cache first
    const cacheKey = `tokens-${chainId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log(`Using cached token list for chain ${chainId}`);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Fetching fresh tokens for chain ${chainId}`);
    
    // Initialize Supabase client to check for tokens in the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if tokens exist in the database
    const { data: dbTokens, error: dbError } = await supabase
      .from('tokens')
      .select('*')
      .eq('chain_id', chainId)
      .limit(500)

    if (dbTokens && dbTokens.length > 0) {
      console.log(`Found ${dbTokens.length} tokens in database for chain ${chainId}`);
      const result = { tokens: dbTokens, source: 'database' };
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // If no tokens in the database, fetch from external source
    let tokenSource: string;
    let tokens: any[] = [];

    switch (chainId) {
      case 1: // Ethereum
        tokenSource = 'https://tokens.coingecko.com/uniswap/all.json';
        break;
      case 56: // BSC
        tokenSource = 'https://tokens.pancakeswap.finance/pancakeswap-extended.json';
        break;
      case 101: // Solana
        // Return hardcoded Solana tokens since no good public API exists
        tokens = [
          { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', chainId: 101, decimals: 9 },
          { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chainId: 101, decimals: 6 },
          { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chainId: 101, decimals: 6 },
          { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chainId: 101, decimals: 5 },
          { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chainId: 101, decimals: 6 },
          { name: 'Raydium', symbol: 'RAY', address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', chainId: 101, decimals: 6 },
          { name: 'Serum', symbol: 'SRM', address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt', chainId: 101, decimals: 6 },
          { name: 'Orca', symbol: 'ORCA', address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', chainId: 101, decimals: 6 },
        ];
        
        // Store Solana tokens in the database for future use
        await supabase.from('tokens').upsert(
          tokens.map(token => ({
            name: token.name,
            symbol: token.symbol,
            address: token.address,
            chain_id: token.chainId,
            decimals: token.decimals,
            is_verified: true,
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString()
          }))
        );
        
        const solanaResult = { tokens, source: 'hardcoded', count: tokens.length };
        cache.set(cacheKey, { data: solanaResult, timestamp: Date.now() });
        
        return new Response(
          JSON.stringify(solanaResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported chain' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Fetch token list for EVM chains
    console.log(`Fetching from external source: ${tokenSource}`);
    const response = await fetch(tokenSource, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract and format tokens
    if (chainId === 1) { // Ethereum
      tokens = data.tokens
        .filter((token: any) => token.chainId === 1)
        .map((token: any) => ({
          name: token.name,
          symbol: token.symbol,
          address: token.address.toLowerCase(),
          chain_id: token.chainId,
          decimals: token.decimals,
          logo_uri: token.logoURI,
          is_verified: true,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }));
    } else if (chainId === 56) { // BSC
      tokens = data.tokens
        .filter((token: any) => token.chainId === 56)
        .map((token: any) => ({
          name: token.name,
          symbol: token.symbol,
          address: token.address.toLowerCase(),
          chain_id: token.chainId,
          decimals: token.decimals,
          logo_uri: token.logoURI,
          is_verified: true,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }));
    }

    // Store tokens in the database for future use
    if (tokens.length > 0) {
      console.log(`Storing ${tokens.length} tokens in database for chain ${chainId}`);
      
      // Batch upsert to avoid request size limitations
      const batchSize = 100;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, Math.min(i + batchSize, tokens.length));
        await supabase.from('tokens').upsert(batch);
      }
    }

    // Return tokens with CORS headers
    const result = { tokens, source: 'external', count: tokens.length };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in fetch-tokens function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
