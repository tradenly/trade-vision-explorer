
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { opportunity, walletAddress, investmentAmount, slippageTolerance } = await req.json()
    
    if (!opportunity || !walletAddress) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    
    // Currently, this is a simulation as we're not executing real trades
    console.log(`Executing arbitrage: ${opportunity.tokenPair} from ${opportunity.buyDex} to ${opportunity.sellDex}`)
    console.log(`Wallet: ${walletAddress}, Investment: $${investmentAmount}`)
    
    // Simulate a successful trade
    const simulatedTxHash = `0x${Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)).join('')}`
    
    // Store trade in database
    const { data: tradeData, error: tradeError } = await supabase
      .from('trading_activity')
      .insert({
        token_pair: opportunity.tokenPair,
        strategy: 'arbitrage',
        type: 'buy_sell',
        status: 'completed',
        tx_hash: simulatedTxHash,
        network_type: opportunity.network,
        amount: investmentAmount,
        price: opportunity.buyPrice,
        fee_amount: opportunity.platformFee,
        details: {
          buyDex: opportunity.buyDex,
          sellDex: opportunity.sellDex,
          buyPrice: opportunity.buyPrice,
          sellPrice: opportunity.sellPrice,
          netProfit: opportunity.netProfit,
          netProfitPercentage: opportunity.netProfitPercentage
        }
      })
    
    if (tradeError) {
      console.error('Error storing trade:', tradeError)
    }
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: simulatedTxHash,
        details: {
          buyDex: opportunity.buyDex,
          sellDex: opportunity.sellDex,
          profit: opportunity.netProfit,
          profitPercentage: opportunity.netProfitPercentage
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
    
  } catch (error) {
    console.error('Error executing trade:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
