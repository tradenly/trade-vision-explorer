
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

interface PriceQuote {
  dexName: string;
  price: number;
  fees: number;
}

interface ArbitrageOpportunity {
  id: string;
  tokenPair: string;
  buyDex: string;
  buyPrice: number;
  sellDex: string;
  sellPrice: number;
  gasFee: number;
  tradingFees: number;
  estimatedProfit: number;
  estimatedProfitPercentage: number;
  network: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, investmentAmount = 1000 } = await req.json();
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} with $${investmentAmount}`);

    // Get enabled DEXs from the database
    const { data: dexSettings, error: dexError } = await supabase
      .from('dex_settings')
      .select('*')
      .eq('enabled', true)
      .in('chain_ids', [baseToken.chainId]);

    if (dexError) throw dexError;

    // Simulate fetching quotes from DEXs
    const quotes: PriceQuote[] = await Promise.all(
      dexSettings.map(async (dex) => {
        // Simulate DEX price variation
        const basePrice = baseToken.symbol === 'ETH' 
          ? 3000 + Math.random() * 100 
          : baseToken.symbol === 'BNB' 
            ? 500 + Math.random() * 20
            : 100 + Math.random() * 10;
        
        const variation = 0.95 + Math.random() * 0.1; // 0.95 - 1.05
        const price = basePrice * variation;

        // Save price to history table
        await supabase.from('dex_price_history').insert({
          token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
          dex_name: dex.name,
          chain_id: baseToken.chainId,
          price
        });

        return {
          dexName: dex.name,
          price,
          fees: dex.trading_fee_percentage
        };
      })
    );

    // Calculate arbitrage opportunities
    const opportunities: ArbitrageOpportunity[] = [];
    const networkName = baseToken.chainId === 1 ? 'ethereum' : 
                        baseToken.chainId === 56 ? 'bnb' : 'solana';
    
    // Gas fee by network (approximate)
    const gasFees: Record<string, number> = {
      ethereum: 5,     // $5 (approximate)
      bnb: 0.25,       // $0.25
      solana: 0.00025  // $0.00025
    };
    const gasFee = gasFees[networkName];
    
    // Compare each DEX pair for arbitrage
    for (let i = 0; i < quotes.length; i++) {
      for (let j = 0; j < quotes.length; j++) {
        if (i === j) continue;
        
        const buyDex = quotes[i];
        const sellDex = quotes[j];
        
        // Calculate price difference
        if (sellDex.price > buyDex.price) {
          // Calculate fees
          const tradingFeeBuy = investmentAmount * (buyDex.fees / 100);
          const amountAfterBuy = (investmentAmount - tradingFeeBuy) / buyDex.price;
          const tradingFeeSell = amountAfterBuy * sellDex.price * (sellDex.fees / 100);
          const totalTradingFees = tradingFeeBuy + tradingFeeSell;
          
          // Calculate profit
          const grossProfit = (amountAfterBuy * sellDex.price) - investmentAmount;
          const netProfit = grossProfit - totalTradingFees - gasFee;
          const profitPercentage = (netProfit / investmentAmount) * 100;
          
          // Only include opportunities with positive profit
          if (netProfit > 0) {
            opportunities.push({
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
              buyDex: buyDex.dexName,
              buyPrice: buyDex.price,
              sellDex: sellDex.dexName,
              sellPrice: sellDex.price,
              gasFee,
              tradingFees: totalTradingFees,
              estimatedProfit: netProfit,
              estimatedProfitPercentage: profitPercentage,
              network: networkName
            });
          }
        }
      }
    }
    
    // Sort by profit percentage
    opportunities.sort((a, b) => b.estimatedProfitPercentage - a.estimatedProfitPercentage);

    // Return opportunities
    return new Response(JSON.stringify({ opportunities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error scanning for arbitrage:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
