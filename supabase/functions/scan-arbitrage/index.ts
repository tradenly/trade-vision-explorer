
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import { scanArbitrageOpportunities } from "./arbitrage-scanner.ts";
import { calculateRiskLevel } from "./utils.ts";
import type { ArbitrageRequest } from "./types.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const request: ArbitrageRequest = await req.json();
    
    if (!request.baseToken || !request.quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Base and quote tokens are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set defaults if not provided
    request.minProfitPercentage = request.minProfitPercentage || 0.5; // 0.5% minimum profit
    request.investmentAmount = request.investmentAmount || 1000; // $1000 default investment
    request.maxAgeSeconds = request.maxAgeSeconds || 30; // 30 seconds max age for price data

    console.log(`Scanning for arbitrage opportunities: ${request.baseToken.symbol}/${request.quoteToken.symbol}`);
    const opportunities = await scanArbitrageOpportunities(supabase, request);
    console.log(`Found ${opportunities.length} opportunities`);

    // Store opportunities in the database if any are found
    if (opportunities.length > 0) {
      const { error } = await supabase
        .from('arbitrage_opportunities')
        .insert(opportunities.map(opp => ({
          network: opp.network,
          token_pair: opp.tokenPair,
          buy_exchange: opp.buyDex,
          sell_exchange: opp.sellDex,
          price_diff: opp.priceDifferencePercentage,
          estimated_profit: opp.netProfit.toFixed(2),
          risk: calculateRiskLevel(opp.netProfitPercentage),
          status: 'active'
        })));

      if (error) {
        console.error('Error storing arbitrage opportunities:', error);
      }
    }

    return new Response(
      JSON.stringify({ opportunities }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in scan-arbitrage function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
