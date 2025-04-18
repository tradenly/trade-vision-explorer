
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
      .limit(300)
    
    // Return cached tokens if available and recent (less than 24h old)
    if (!cachedError && cachedTokens && cachedTokens.length > 10) {
      const lastUpdated = new Date(cachedTokens[0].last_updated);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        console.log(`Found ${cachedTokens.length} cached tokens for chain ${chainId}`);
        
        // Convert from database format to TokenInfo format
        const tokens = cachedTokens.map(token => ({
          address: token.address,
          chainId: token.chain_id,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logo_uri
        }));
        
        return new Response(
          JSON.stringify({ tokens, source: 'database', count: tokens.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log(`Cached tokens for chain ${chainId} are ${hoursSinceUpdate.toFixed(1)}h old, fetching fresh data`);
    }

    // Fetch from external sources if cached data not available or too old
    let tokens: TokenInfo[] = [];

    if (chainId === 1) { // Ethereum
      tokens = await fetchEthereumTokens();
    } 
    else if (chainId === 56) { // BSC
      tokens = await fetchBSCTokens();
    }
    else if (chainId === 101) { // Solana
      tokens = await fetchSolanaTokens();
    }
    else if (chainId === 137) { // Polygon
      tokens = await fetchPolygonTokens();
    }
    else if (chainId === 42161) { // Arbitrum
      tokens = await fetchArbitrumTokens();
    }
    else if (chainId === 8453) { // Base
      tokens = await fetchBaseTokens();
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
      console.log(`Storing ${tokens.length} tokens for chain ${chainId} in database`);
      
      try {
        for (const token of tokens.slice(0, 300)) { // Limit to 300 tokens to avoid timeout
          await supabase
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
        }
      } catch (dbError) {
        console.error("Error saving tokens to database:", dbError);
      }
    }

    return new Response(
      JSON.stringify({ tokens, source: 'api', count: tokens.length }),
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

async function fetchEthereumTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.tokens.filter((t: any) => t.chainId === 1);
  } catch (error) {
    console.error("Error fetching Ethereum tokens:", error);
    return [];
  }
}

async function fetchBSCTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://tokens.pancakeswap.finance/pancakeswap-extended.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.tokens.filter((t: any) => t.chainId === 56);
  } catch (error) {
    console.error("Error fetching BSC tokens:", error);
    return [];
  }
}

async function fetchSolanaTokens(): Promise<TokenInfo[]> {
  try {
    // Fetch from Solana token list
    const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    
    // Map to our TokenInfo format
    return data.tokens
      .filter((t: any) => t.chainId === 101)
      .map((t: any) => ({
        address: t.address,
        chainId: 101,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        logoURI: t.logoURI
      }));
  } catch (error) {
    console.error("Error fetching Solana tokens:", error);
    
    // Return a minimal hardcoded list as fallback
    return [
      { name: 'Solana', symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', chainId: 101, decimals: 9 },
      { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', chainId: 101, decimals: 6 },
      { name: 'Tether', symbol: 'USDT', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', chainId: 101, decimals: 6 },
      { name: 'Bonk', symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chainId: 101, decimals: 5 },
      { name: 'Jupiter', symbol: 'JUP', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chainId: 101, decimals: 6 }
    ];
  }
}

async function fetchPolygonTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://unpkg.com/@0xsequence/token-list@1/dist/tokens.polygon.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.tokens;
  } catch (error) {
    console.error("Error fetching Polygon tokens:", error);
    return [];
  }
}

async function fetchArbitrumTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://tokens.coingecko.com/arbitrum-one/all.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.tokens;
  } catch (error) {
    console.error("Error fetching Arbitrum tokens:", error);
    return [];
  }
}

async function fetchBaseTokens(): Promise<TokenInfo[]> {
  try {
    const response = await fetch('https://raw.githubusercontent.com/base-org/token-list/main/lists/base.tokenlist.json');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.tokens;
  } catch (error) {
    console.error("Error fetching Base tokens:", error);
    return [];
  }
}
