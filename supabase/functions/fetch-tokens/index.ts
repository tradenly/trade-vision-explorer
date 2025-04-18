
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define token interface
interface TokenInfo {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
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

    // Choose token source based on chain
    let tokenSource: string;
    let tokens: TokenInfo[] = [];

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
        
        return new Response(
          JSON.stringify({ tokens, source: 'hardcoded', count: tokens.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      default:
        return new Response(
          JSON.stringify({ error: 'Unsupported chain' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Fetch token list for EVM chains
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
          address: token.address,
          chainId: token.chainId,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI
        }));
    } else if (chainId === 56) { // BSC
      tokens = data.tokens
        .filter((token: any) => token.chainId === 56)
        .map((token: any) => ({
          address: token.address,
          chainId: token.chainId,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI
        }));
    }

    // Return tokens with CORS headers
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
