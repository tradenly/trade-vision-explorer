
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handler for CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
}

// Define supported DEXes for different chains
const DEX_CONFIGS = {
  // Ethereum (Chain ID: 1)
  1: ['uniswap', 'sushiswap', 'curve', 'balancer'],
  
  // BSC (Chain ID: 56)
  56: ['pancakeswap', 'sushiswap'],
  
  // Solana (Chain ID: 101)
  101: ['jupiter', 'raydium', 'orca'],
  
  // Base (Chain ID: 8453)
  8453: ['uniswap', 'balancer', 'curve'],
  
  // Polygon (Chain ID: 137)
  137: ['uniswap', 'sushiswap', 'curve', 'quickswap'],
  
  // Arbitrum (Chain ID: 42161)
  42161: ['uniswap', 'sushiswap', 'curve'],
  
  // Optimism (Chain ID: 10)
  10: ['uniswap', 'curve'],
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { baseToken, quoteToken } = await req.json();
    
    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token information' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const chainId = baseToken.chainId;
    
    if (!DEX_CONFIGS[chainId]) {
      return new Response(
        JSON.stringify({ error: `Chain ID ${chainId} not supported` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // 1. Try to get prices from adapters
    let prices: Record<string, any> = {};
    
    // If this is Solana, use Jupiter aggregator API
    if (chainId === 101) {
      try {
        const jupiterResponse = await fetch(`https://price.jup.ag/v4/price?ids=${baseToken.address}&vsToken=${quoteToken.address}`);
        const jupiterData = await jupiterResponse.json();
        
        if (jupiterData.data && jupiterData.data[baseToken.address]) {
          const price = jupiterData.data[baseToken.address].price;
          
          // Add Jupiter price
          prices['jupiter'] = {
            price: price,
            liquidity: 1000000, // Default value since Jupiter doesn't provide liquidity info
          };
          
          // For demo, add slightly different prices for other Solana DEXes
          prices['orca'] = {
            price: price * (0.98 + Math.random() * 0.04), // +/- 2% variation
            liquidity: 800000,
          };
          
          prices['raydium'] = {
            price: price * (0.97 + Math.random() * 0.06), // +/- 3% variation
            liquidity: 750000,
          };
        }
      } catch (error) {
        console.error('Error fetching Jupiter prices:', error);
      }
    } 
    // For EVM chains, try 1inch API
    else {
      // Get list of DEXes to check for this chain
      const dexes = DEX_CONFIGS[chainId];
      
      if (dexes?.includes('uniswap')) {
        try {
          // Simulate Uniswap price (in production, this would be a real API call)
          // Use 1inch API to get prices from Uniswap
          const response = await fetch(`https://api.1inch.io/v5.0/${chainId}/quote?fromTokenAddress=${baseToken.address}&toTokenAddress=${quoteToken.address}&amount=1000000000000000000`);
          
          if (response.ok) {
            const data = await response.json();
            const basePrice = Number(data.toTokenAmount) / Number(data.fromTokenAmount);
            
            // Record Uniswap price
            prices['uniswap'] = {
              price: basePrice,
              liquidity: 2000000,
            };
            
            // For demo, generate realistic prices for other DEXs
            if (dexes.includes('sushiswap')) {
              prices['sushiswap'] = {
                price: basePrice * (0.99 + Math.random() * 0.02), // +/- 1% variation
                liquidity: 1500000,
              };
            }
            
            if (dexes.includes('curve')) {
              prices['curve'] = {
                price: basePrice * (0.995 + Math.random() * 0.01), // +/- 0.5% variation
                liquidity: 3000000,
              };
            }
            
            if (dexes.includes('balancer')) {
              prices['balancer'] = {
                price: basePrice * (0.98 + Math.random() * 0.04), // +/- 2% variation
                liquidity: 1200000,
              };
            }
            
            if (dexes.includes('pancakeswap')) {
              prices['pancakeswap'] = {
                price: basePrice * (0.97 + Math.random() * 0.06), // +/- 3% variation
                liquidity: 1800000,
              };
            }
          }
        } catch (error) {
          console.error('Error fetching 1inch prices:', error);
        }
      }
    }
    
    // 2. Fallback to database if no prices were obtained
    if (Object.keys(prices).length === 0) {
      // Query latest prices from database
      const { data: dbPrices, error } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .eq('chain_id', chainId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) {
        throw error;
      }
      
      if (dbPrices && dbPrices.length > 0) {
        // Group by DEX name
        const dexPrices = new Map();
        dbPrices.forEach(record => {
          if (!dexPrices.has(record.dex_name)) {
            dexPrices.set(record.dex_name, {
              price: record.price,
              liquidity: record.liquidity || 100000,
            });
          }
        });
        
        // Convert to object
        dexPrices.forEach((value, key) => {
          prices[key] = value;
        });
      }
    }

    // 3. Store the price data we collected
    if (Object.keys(prices).length > 0) {
      const timestamp = new Date().toISOString();
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      
      // Insert prices into dex_price_history
      const priceRecords = Object.entries(prices).map(([dexName, data]) => ({
        dex_name: dexName,
        token_pair: tokenPair,
        price: data.price,
        chain_id: chainId,
        liquidity: data.liquidity || null,
        timestamp: timestamp
      }));
      
      await supabase.from('dex_price_history').insert(priceRecords);
    }

    // Return the prices to the client
    return new Response(
      JSON.stringify({ prices }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in real-time-prices function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
