
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { processSolanaTokenPairs } from "./solana.ts";
import { processEvmTokenPairs } from "./evm.ts";
import { TokenPair } from "./types.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { tokenPairs = [], chainId } = await req.json();

    if (!tokenPairs.length) {
      return new Response(
        JSON.stringify({ error: 'No token pairs provided' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: dexSettings } = await supabase
      .from('dex_settings')
      .select('*')
      .contains('chain_ids', [chainId])
      .eq('enabled', true);

    if (!dexSettings || dexSettings.length === 0) {
      return new Response(
        JSON.stringify({ error: `No enabled DEXes found for chain ${chainId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${tokenPairs.length} pairs for chain ${chainId}`);

    const batchSize = 3;
    const results = [];

    for (let i = 0; i < tokenPairs.length; i += batchSize) {
      const batch = tokenPairs.slice(i, i + batchSize);
      
      for (const dex of dexSettings) {
        console.log(`Fetching prices from ${dex.name} for batch ${i/batchSize + 1}`);
        
        try {
          if (chainId === 101) {
            await processSolanaTokenPairs(batch, dex, supabase);
          } else {
            await processEvmTokenPairs(batch, dex, chainId, supabase);
          }

          results.push({
            dex: dex.name,
            pairs: batch.length,
            success: true
          });
          
        } catch (error) {
          console.error(`Error fetching prices from ${dex.name}:`, error);
          results.push({
            dex: dex.name,
            error: error.message,
            success: false
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (i + batchSize < tokenPairs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in update-price-data function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
