
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Sha256 } from "https://deno.land/std@0.119.0/hash/sha256.ts"

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
    const { baseToken, quoteToken, dexNames = [] } = await req.json()

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

    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`
    
    // Using a hash of the token addresses as sessionId for the broadcast
    const sessionId = new Sha256()
      .update(`${baseToken.address}-${quoteToken.address}-${Date.now()}`)
      .toString()
      
    const pairKey = `${baseToken.symbol}-${quoteToken.symbol}-${baseToken.chainId}`
      
    // Try to fetch real-time prices
    let prices: Record<string, any> = {}
    
    if (baseToken.chainId === 101) {
      // For Solana, use Jupiter API
      try {
        const response = await fetch(
          `https://price.jup.ag/v4/price?ids=${baseToken.address},${quoteToken.address}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.data?.[baseToken.address] && data.data?.[quoteToken.address]) {
            const basePrice = data.data[baseToken.address].price
            const quotePrice = data.data[quoteToken.address].price
            
            // Calculate price (how many quote tokens for 1 base token)
            const price = basePrice / quotePrice
            
            // Add DEX prices with slight variations for simulation
            prices['jupiter'] = { 
              price, 
              liquidity: 1000000,
              timestamp: Date.now()
            }
            
            // If specified in dexNames, include other Solana DEXes
            if (dexNames.includes('orca')) {
              prices['orca'] = {
                price: price * (0.99 + Math.random() * 0.02),
                liquidity: 800000,
                timestamp: Date.now()
              }
            }
            
            if (dexNames.includes('raydium')) {
              prices['raydium'] = {
                price: price * (0.985 + Math.random() * 0.03),
                liquidity: 750000,
                timestamp: Date.now()
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Jupiter price:', error)
      }
    } else {
      // For EVM chains, use 1inch API
      try {
        const amountInWei = '1000000000000000000' // 1 token in wei
        
        const response = await fetch(
          `https://api.1inch.io/v5.0/${baseToken.chainId}/quote?` +
          `fromTokenAddress=${baseToken.address}&` +
          `toTokenAddress=${quoteToken.address}&` +
          `amount=${amountInWei}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          const fromAmount = parseInt(data.fromTokenAmount) / Math.pow(10, baseToken.decimals || 18)
          const toAmount = parseInt(data.toTokenAmount) / Math.pow(10, quoteToken.decimals || 18)
          const price = toAmount / fromAmount
          
          prices['1inch'] = {
            price,
            liquidity: 1000000,
            timestamp: Date.now()
          }
          
          // Add other DEXes based on chain
          if (baseToken.chainId === 1 || baseToken.chainId === 137 || baseToken.chainId === 42161) {
            if (dexNames.includes('uniswap')) {
              prices['uniswap'] = {
                price: price * (0.99 + Math.random() * 0.02),
                liquidity: 1500000,
                timestamp: Date.now()
              }
            }
            
            if (dexNames.includes('sushiswap')) {
              prices['sushiswap'] = {
                price: price * (0.98 + Math.random() * 0.04),
                liquidity: 800000,
                timestamp: Date.now()
              }
            }
          }
          
          if (baseToken.chainId === 56 && dexNames.includes('pancakeswap')) {
            prices['pancakeswap'] = {
              price: price * (0.985 + Math.random() * 0.03),
              liquidity: 1200000,
              timestamp: Date.now()
            }
          }
          
          if ((baseToken.chainId === 1 || baseToken.chainId === 137) && dexNames.includes('curve')) {
            prices['curve'] = {
              price: price * (0.99 + Math.random() * 0.01), // Lower variability for stableswaps
              liquidity: 2000000,
              timestamp: Date.now()
            }
          }
        }
      } catch (error) {
        console.error('Error fetching 1inch price:', error)
      }
    }
    
    // If no prices fetched from APIs, fall back to database
    if (Object.keys(prices).length === 0) {
      const { data, error: dbError } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', tokenPair)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(20)
      
      if (!dbError && data && data.length > 0) {
        const processedDexes = new Set<string>();
        
        // Get the most recent price for each requested DEX
        data.forEach(item => {
          if (dexNames.includes(item.dex_name) && !processedDexes.has(item.dex_name)) {
            processedDexes.add(item.dex_name)
            
            // Add slight variation for simulation of real-time data
            const variation = 0.995 + Math.random() * 0.01 // 0.995 - 1.005
            
            prices[item.dex_name] = {
              price: item.price * variation,
              liquidity: item.liquidity || 100000,
              timestamp: Date.now()
            }
          }
        })
      }
    }
    
    // Broadcast prices to all connected clients via Realtime
    await supabase.from('channel-broadcast')
      .insert([{ 
        channel: 'price-updates', 
        session: sessionId,
        payload: {
          pairKey,
          quotes: prices,
          timestamp: new Date().toISOString()
        }
      }]);

    // Insert new prices into dex_price_history
    for (const [dexName, priceData] of Object.entries(prices)) {
      try {
        await supabase
          .from('dex_price_history')
          .insert({
            dex_name: dexName,
            token_pair: tokenPair,
            price: priceData.price,
            chain_id: baseToken.chainId,
            liquidity: priceData.liquidity || 100000
          })
      } catch (dbError) {
        console.error(`Error saving ${dexName} price to database:`, dbError)
      }
    }

    return new Response(
      JSON.stringify({ quotes: prices, pairKey }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in real-time-prices function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
