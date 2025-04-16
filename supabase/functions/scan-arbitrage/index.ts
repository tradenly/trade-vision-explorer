
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping of chain IDs to network names
const CHAIN_NETWORK_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bnb',
  101: 'solana'
};

// Function to get gas fees for a specific network
async function getNetworkGasFees(network: string) {
  const { data, error } = await supabase
    .from('gas_fees')
    .select('*')
    .eq('network', network)
    .single();

  if (error) {
    console.error(`Error fetching gas fees for ${network}:`, error);
    return { base_fee: 0, priority_fee: 0, is_lamports: false };
  }

  return data;
}

// Function to get DEX settings for a specific chain
async function getDexSettingsForChain(chainId: number) {
  const { data, error } = await supabase
    .from('dex_settings')
    .select('*')
    .contains('chain_ids', [chainId])
    .eq('enabled', true);

  if (error) {
    console.error(`Error fetching DEX settings for chain ${chainId}:`, error);
    return [];
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, investmentAmount = 1000, minProfitPercentage = 0.5 } = await req.json();
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} with $${investmentAmount}`);

    // Get network name from chain ID
    const networkName = CHAIN_NETWORK_MAP[baseToken.chainId] || 'ethereum';

    // Get gas fees for the network
    const gasFees = await getNetworkGasFees(networkName);

    // Get enabled DEXs for this chain
    const dexSettings = await getDexSettingsForChain(baseToken.chainId);

    // Fetch scan settings
    const { data: scanSettings, error: scanSettingsError } = await supabase
      .from('scan_settings')
      .select('*')
      .single();

    if (scanSettingsError) {
      console.error('Error fetching scan settings:', scanSettingsError);
      throw scanSettingsError;
    }

    // Generate arbitrage opportunities (placeholder logic)
    // In a real implementation, this would fetch actual prices from DEX APIs
    const opportunities = dexSettings.flatMap((buyDex, buyIndex) => 
      dexSettings
        .filter((_, sellIndex) => sellIndex !== buyIndex)
        .map(sellDex => {
          // Simulated price difference calculation
          const buyPrice = 1900 + Math.random() * 10;
          const sellPrice = buyPrice * (1 + Math.random() * 0.05);

          // Basic profit calculation
          const tradingFeeBuy = investmentAmount * (buyDex.trading_fee_percentage / 100);
          const tradingFeeSell = investmentAmount * (sellDex.trading_fee_percentage / 100);
          const tokenAmount = (investmentAmount - tradingFeeBuy) / buyPrice;
          const saleAmount = tokenAmount * sellPrice;
          const netProfit = saleAmount - investmentAmount - tradingFeeBuy - tradingFeeSell - gasFees.base_fee;
          const profitPercentage = (netProfit / investmentAmount) * 100;

          return profitPercentage > scanSettings.profit_threshold ? {
            buyDex: buyDex.name,
            sellDex: sellDex.name,
            buyPrice,
            sellPrice,
            profitPercentage,
            netProfit,
            token: baseToken.symbol
          } : null;
        })
        .filter(Boolean)
    );

    // Store arbitrage opportunities in the database
    if (opportunities.length > 0) {
      const opportunitiesToStore = opportunities.map(op => ({
        token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
        buy_exchange: op.buyDex,
        sell_exchange: op.sellDex,
        estimated_profit: op.netProfit.toFixed(2),
        network: networkName,
        status: 'active'
      }));

      const { error: storeError } = await supabase
        .from('arbitrage_opportunities')
        .insert(opportunitiesToStore);

      if (storeError) {
        console.error('Error storing arbitrage opportunities:', storeError);
      }
    }

    return new Response(JSON.stringify({ opportunities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error scanning for arbitrage:", error);
    return new Response(JSON.stringify({ error: error.message, opportunities: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
