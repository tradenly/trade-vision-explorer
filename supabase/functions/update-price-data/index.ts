
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
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

    // Get DEX settings for supported DEXes on this chain
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

    // Process token pairs in batches to avoid rate limits
    const batchSize = 3;
    const results = [];

    for (let i = 0; i < tokenPairs.length; i += batchSize) {
      const batch = tokenPairs.slice(i, i + batchSize);
      
      // For each DEX, fetch prices for the batch
      for (const dex of dexSettings) {
        console.log(`Fetching prices from ${dex.name} for batch ${i/batchSize + 1}`);
        
        try {
          // Use 1inch API for price discovery across DEXes
          const pricePromises = batch.map(async (pair: any) => {
            const amountIn = "1000000000000000000"; // 1 token in wei
            const url = `https://api.1inch.io/v5.0/${chainId}/quote?` +
              `fromTokenAddress=${pair.baseToken.address}&` +
              `toTokenAddress=${pair.quoteToken.address}&` +
              `amount=${amountIn}&` +
              `protocols=${dex.name.toLowerCase()}`;

            const response = await fetch(url, {
              headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
              throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Calculate price from response
            const fromDecimals = pair.baseToken.decimals || 18;
            const toDecimals = pair.quoteToken.decimals || 18;
            const fromAmount = parseInt(data.fromTokenAmount) / Math.pow(10, fromDecimals);
            const toAmount = parseInt(data.toTokenAmount) / Math.pow(10, toDecimals);
            const price = toAmount / fromAmount;

            return {
              token_pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
              price,
              chain_id: chainId,
              dex_name: dex.name.toLowerCase(),
              timestamp: new Date().toISOString(),
              liquidity: data.protocols?.[0]?.[0]?.liquidityInUsd || 0
            };
          });

          const prices = await Promise.all(pricePromises);

          // Store prices in database
          if (prices.length > 0) {
            const { error: insertError } = await supabase
              .from('dex_price_history')
              .insert(prices);

            if (insertError) {
              console.error(`Error storing prices for ${dex.name}:`, insertError);
              continue;
            }

            results.push({
              dex: dex.name,
              pairs: prices.length,
              success: true
            });
          }

        } catch (error) {
          console.error(`Error fetching prices from ${dex.name}:`, error);
          results.push({
            dex: dex.name,
            error: error.message,
            success: false
          });
        }

        // Add delay between DEX requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Add delay between batches
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
