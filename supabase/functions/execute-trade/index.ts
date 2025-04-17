
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
  liquidityBuy?: number;
  liquiditySell?: number;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Calculate potential slippage and price impact based on trade size and liquidity
function calculatePriceImpact(tradeAmount: number, liquidity: number): number {
  // Simple price impact model: impact = (tradeAmount / liquidity) * 100
  const impact = (tradeAmount / liquidity) * 100;
  // Cap at 10% for very large trades
  return Math.min(impact, 10);
}

// Simulate a trade with slippage calculation
async function simulateTrade(opportunity: ArbitrageOpportunity, investmentAmount: number) {
  // Default slippage tolerance
  const slippageTolerance = 0.5; // 0.5%
  
  // Calculate price impact based on trade size and liquidity
  const buyPriceImpact = opportunity.liquidityBuy
    ? calculatePriceImpact(investmentAmount, opportunity.liquidityBuy)
    : 0.1; // Default small impact
  
  const sellPriceImpact = opportunity.liquiditySell
    ? calculatePriceImpact(investmentAmount, opportunity.liquiditySell)
    : 0.1; // Default small impact
  
  // Adjust prices based on impact
  const adjustedBuyPrice = opportunity.buyPrice * (1 + buyPriceImpact / 100);
  const adjustedSellPrice = opportunity.sellPrice * (1 - sellPriceImpact / 100);
  
  // Trading fees
  const tradingFeeBuy = investmentAmount * (opportunity.tradingFees / 2 / 100);
  const tradingFeeSell = investmentAmount * (opportunity.tradingFees / 2 / 100);
  
  // Calculate token amounts
  const tokenAmount = (investmentAmount - tradingFeeBuy) / adjustedBuyPrice;
  const saleAmount = tokenAmount * adjustedSellPrice - tradingFeeSell;
  
  // Calculate net profit after all fees
  const gasFee = opportunity.gasFee;
  const platformFee = investmentAmount * 0.005; // 0.5% platform fee
  const netProfit = saleAmount - investmentAmount - gasFee - platformFee;
  
  // Check if trade is still profitable after adjustments
  const isProfitable = netProfit > 0;
  
  // Check if slippage exceeds tolerance
  const priceSlippage = (Math.abs(adjustedBuyPrice - opportunity.buyPrice) / opportunity.buyPrice) * 100 +
                        (Math.abs(adjustedSellPrice - opportunity.sellPrice) / opportunity.sellPrice) * 100;
  const isWithinSlippage = priceSlippage <= slippageTolerance;
  
  return {
    isProfitable,
    isWithinSlippage,
    priceImpact: {
      buy: buyPriceImpact,
      sell: sellPriceImpact
    },
    slippage: priceSlippage,
    adjustedPrices: {
      buy: adjustedBuyPrice,
      sell: adjustedSellPrice
    },
    netProfit,
    tokenAmount,
    saleAmount,
    tradingFees: tradingFeeBuy + tradingFeeSell,
    gasFee,
    platformFee
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { opportunity, walletAddress, investmentAmount = 1000 } = await req.json();
    console.log(`Executing trade for ${opportunity.tokenPair} on network ${opportunity.network}`);
    console.log(`Buy on ${opportunity.buyDex} at ${opportunity.buyPrice}, sell on ${opportunity.sellDex} at ${opportunity.sellPrice}`);
    console.log(`Wallet address: ${walletAddress}`);
    
    // Simulate the trade with price impact and slippage
    const simulation = await simulateTrade(opportunity, investmentAmount);
    
    // Check if trade is still viable
    if (!simulation.isProfitable) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Trade is no longer profitable after price impact calculation",
        details: simulation
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    if (!simulation.isWithinSlippage) {
      return new Response(JSON.stringify({ 
        success: false,
        error: `Slippage too high (${simulation.slippage.toFixed(2)}%) exceeds tolerance`,
        details: simulation
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    // In a real implementation, this function would:
    // 1. Connect to the appropriate DEX SDK based on the chain
    // 2. Prepare and send buy transaction to the first DEX
    // 3. Wait for confirmation
    // 4. Prepare and send sell transaction to the second DEX
    
    // Simulate trade processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
        network_type: opportunity.network,
        details: {
          buy_dex: opportunity.buyDex,
          sell_dex: opportunity.sellDex,
          buy_price: simulation.adjustedPrices.buy,
          sell_price: simulation.adjustedPrices.sell,
          wallet_address: walletAddress,
          network: opportunity.network,
          gas_fee: opportunity.gasFee,
          trading_fees: simulation.tradingFees,
          platform_fee: simulation.platformFee,
          price_impact_buy: simulation.priceImpact.buy,
          price_impact_sell: simulation.priceImpact.sell,
          slippage: simulation.slippage,
          buy_tx: buyTxHash,
          sell_tx: sellTxHash,
          investment_amount: investmentAmount,
          token_amount: simulation.tokenAmount
        },
        fee_amount: simulation.platformFee
      });
    
    // Return success result with transaction details
    const result: TradeResult = {
      success: true, 
      txHash: buyTxHash + ',' + sellTxHash,
      details: {
        buyTx: buyTxHash,
        sellTx: sellTxHash,
        gasFee: opportunity.gasFee,
        tradingFees: simulation.tradingFees,
        platformFee: simulation.platformFee,
        netProfit: simulation.netProfit,
        priceImpact: simulation.priceImpact,
        slippage: simulation.slippage,
        adjustedPrices: simulation.adjustedPrices
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
