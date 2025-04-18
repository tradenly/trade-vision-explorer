
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import { scanArbitrageOpportunities } from "./arbitrage-scanner.ts";
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

    const opportunities = await scanArbitrageOpportunities(supabase, request);

    // Store opportunities in the database if any are found
    if (opportunities.length > 0) {
      await supabase
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
