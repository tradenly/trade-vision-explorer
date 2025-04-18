
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define interfaces
interface TokenInfo {
  address: string
  chainId: number
  name: string
  symbol: string
  decimals: number
  logoURI?: string
}

interface ArbitrageOpportunity {
  baseToken: TokenInfo
  quoteToken: TokenInfo
  buyDex: string
  sellDex: string
  buyPrice: number
  sellPrice: number
  priceDifference: number
  percentageDifference: number
  network: string
  tradingFees: number
  gasFee: number
  platformFee: number
  netProfit: number
  investmentAmount: number
  id: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { baseToken, quoteToken, minProfitPercentage = 0.5, investmentAmount = 1000 } = await req.json()

    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // First, try to get the most recent price data for all DEXes
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`
    
    const { data: priceData, error: priceError } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', tokenPair)
      .eq('chain_id', baseToken.chainId)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (priceError || !priceData || priceData.length === 0) {
      // If no data, try to fetch fresh prices
      const { data } = await supabase.functions.invoke('fetch-prices', {
        body: { baseToken, quoteToken }
      })

      if (!data || !data.prices || Object.keys(data.prices).length < 2) {
        return new Response(
          JSON.stringify({ 
            opportunities: [], 
            error: 'Not enough DEXes available for arbitrage comparison'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get DEX settings for fee calculation
    const { data: dexSettings } = await supabase
      .from('dex_settings')
      .select('*')
      .eq('enabled', true)
    
    // Ensure unique prices per DEX
    const latestPrices: Record<string, { price: number; timestamp: string }> = {}
    
    if (priceData && priceData.length > 0) {
      // Group the latest price for each DEX
      for (const price of priceData) {
        if (!latestPrices[price.dex_name] || 
            new Date(price.timestamp) > new Date(latestPrices[price.dex_name].timestamp)) {
          latestPrices[price.dex_name] = {
            price: price.price,
            timestamp: price.timestamp
          }
        }
      }
    }

    // Ensure we have at least 2 DEXes for comparison
    if (Object.keys(latestPrices).length < 2) {
      return new Response(
        JSON.stringify({ 
          opportunities: [], 
          error: 'Not enough DEXes available for arbitrage comparison'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find arbitrage opportunities by comparing prices
    const opportunities: ArbitrageOpportunity[] = []
    const dexNames = Object.keys(latestPrices)
    
    // Get platform fee
    const { data: feeData } = await supabase
      .from('fees')
      .select('*')
      .eq('fee_type', 'platform')
      .single()
      
    const platformFeePercentage = feeData?.value || 0.01 // Default to 1%
    
    // Get network name from chain ID
    let networkName = 'Ethereum'
    if (baseToken.chainId === 1) networkName = 'Ethereum'
    else if (baseToken.chainId === 56) networkName = 'BNB Chain'
    else if (baseToken.chainId === 137) networkName = 'Polygon'
    else if (baseToken.chainId === 101) networkName = 'Solana'
    else if (baseToken.chainId === 42161) networkName = 'Arbitrum'
    else if (baseToken.chainId === 10) networkName = 'Optimism'
    else if (baseToken.chainId === 8453) networkName = 'Base'
    
    // Define trading fees per DEX (if not available in settings)
    const defaultTradingFees: Record<string, number> = {
      'uniswap': 0.003, // 0.3%
      'sushiswap': 0.003, // 0.3%
      'pancakeswap': 0.0025, // 0.25%
      'jupiter': 0.0035, // 0.35%
      'orca': 0.003, // 0.3%
      'raydium': 0.003, // 0.3% 
      'balancer': 0.002, // 0.2%
      'curve': 0.0004 // 0.04%
    }
    
    // Define gas fee estimates by chain
    const gasEstimates: Record<number, number> = {
      1: 0.005,     // Ethereum ~$5
      56: 0.0005,   // BSC ~$0.50
      137: 0.001,   // Polygon ~$1
      101: 0.00001, // Solana ~$0.01
      42161: 0.001, // Arbitrum ~$1
      10: 0.0005,   // Optimism ~$0.50
      8453: 0.001   // Base ~$1
    }
    const gasFee = gasEstimates[baseToken.chainId] || 0.005;

    // Compare all DEX pairs for arbitrage
    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const dex1 = dexNames[i]
        const dex2 = dexNames[j]
        
        const price1 = latestPrices[dex1].price
        const price2 = latestPrices[dex2].price
        
        // Calculate absolute price difference
        const absoluteDiff = Math.abs(price1 - price2)
        
        // Calculate percentage difference
        const maxPrice = Math.max(price1, price2)
        const minPrice = Math.min(price1, price2)
        const percentageDiff = ((maxPrice - minPrice) / minPrice) * 100
        
        if (percentageDiff > minProfitPercentage) {
          // Determine buy and sell sides
          const buyDex = price1 < price2 ? dex1 : dex2
          const sellDex = price1 < price2 ? dex2 : dex1
          const buyPrice = price1 < price2 ? price1 : price2
          const sellPrice = price1 < price2 ? price2 : price1
          
          // Calculate fees
          const dexFeeSettings = {
            [buyDex]: dexSettings?.find(ds => ds.slug === buyDex)?.trading_fee_percentage || defaultTradingFees[buyDex.toLowerCase()] || 0.003,
            [sellDex]: dexSettings?.find(ds => ds.slug === sellDex)?.trading_fee_percentage || defaultTradingFees[sellDex.toLowerCase()] || 0.003
          }
          
          const buyFee = investmentAmount * (dexFeeSettings[buyDex] || 0.003)
          const sellValue = (investmentAmount / buyPrice) * sellPrice  
          const sellFee = sellValue * (dexFeeSettings[sellDex] || 0.003)
          const totalTradingFees = buyFee + sellFee
          
          // Platform fee
          const profit = sellValue - investmentAmount - totalTradingFees - gasFee
          const platformFee = profit * platformFeePercentage
          
          // Net profit after all fees
          const netProfit = profit - platformFee
          
          // Only include if profitable after all fees
          if (netProfit > 0) {
            opportunities.push({
              baseToken,
              quoteToken,
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              priceDifference: absoluteDiff,
              percentageDifference: percentageDiff,
              network: networkName,
              tradingFees: totalTradingFees,
              gasFee,
              platformFee,
              netProfit,
              investmentAmount,
              id: crypto.randomUUID()
            })
          }
        }
      }
    }

    // Sort opportunities by profit percentage (highest first)
    opportunities.sort((a, b) => b.percentageDifference - a.percentageDifference)

    return new Response(
      JSON.stringify({ opportunities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scan-arbitrage function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message, opportunities: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
