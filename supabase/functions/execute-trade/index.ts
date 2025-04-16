
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: any;
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
  platformFee: number;
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
    const { opportunity, walletAddress } = await req.json();
    console.log(`Executing trade for ${opportunity.tokenPair} on network ${opportunity.network}`);
    console.log(`Buy on ${opportunity.buyDex} at ${opportunity.buyPrice}, sell on ${opportunity.sellDex} at ${opportunity.sellPrice}`);
    console.log(`Wallet address: ${walletAddress}`);
    
    // In a real implementation, this function would:
    // 1. Connect to the appropriate DEX SDK based on the chain
    // 2. Prepare and send buy transaction to the first DEX
    // 3. Wait for confirmation
    // 4. Prepare and send sell transaction to the second DEX
    
    // Simulate trade processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Calculate all fees
    const totalGasFee = opportunity.gasFee;
    const totalTradingFees = opportunity.tradingFees;
    const tradenlyCut = opportunity.platformFee; // 0.5% platform fee
    
    // Real trade execution would return transaction hashes and details
    const buyTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const sellTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Log the trade in our database
    await supabase
      .from('trading_activity')
      .insert({
        type: 'arbitrage',
        strategy: 'manual',
        token_pair: opportunity.tokenPair,
        price: opportunity.buyPrice,
        amount: opportunity.estimatedProfit + opportunity.platformFee, // Total profit before platform fee
        status: 'completed',
        tx_hash: buyTxHash + ',' + sellTxHash,
        details: {
          buy_dex: opportunity.buyDex,
          sell_dex: opportunity.sellDex,
          buy_price: opportunity.buyPrice,
          sell_price: opportunity.sellPrice,
          wallet_address: walletAddress,
          network: opportunity.network,
          gas_fee: totalGasFee,
          trading_fees: totalTradingFees,
          platform_fee: tradenlyCut,
          buy_tx: buyTxHash,
          sell_tx: sellTxHash,
        },
        fee_amount: tradenlyCut
      });
    
    // Return success result with transaction details
    const result: TradeResult = {
      success: true, 
      txHash: buyTxHash + ',' + sellTxHash,
      details: {
        buyTx: buyTxHash,
        sellTx: sellTxHash,
        gasFee: totalGasFee,
        tradingFees: totalTradingFees,
        platformFee: tradenlyCut,
        netProfit: opportunity.estimatedProfit
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error executing trade:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
