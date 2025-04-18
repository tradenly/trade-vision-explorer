
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache for 30 seconds
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_EXPIRY = 30000; // 30 seconds

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { baseToken, quoteToken } = await req.json()

    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Missing token parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a unique key for caching
    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log(`Using cached price data for ${baseToken.symbol}/${quoteToken.symbol}`);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    console.log(`Fetching fresh price data for ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);

    let prices: Record<string, any> = {};

    // Choose appropriate price data source based on chain
    if (baseToken.chainId === 101) { // Solana
      prices = await fetchSolanaPrices(baseToken, quoteToken);
    } else { // EVM chains
      prices = await fetchEVMPrices(baseToken, quoteToken);
    }

    const result = { prices };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in fetch-prices function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchSolanaPrices(baseToken: any, quoteToken: any): Promise<Record<string, any>> {
  const prices: Record<string, any> = {};
  
  try {
    // Use Jupiter API for Solana token prices
    const jupiterUrl = `https://price.jup.ag/v4/price?ids=${baseToken.address},${quoteToken.address}`;
    console.log(`Fetching Solana prices from Jupiter: ${jupiterUrl}`);
    
    const jupiterRes = await fetch(jupiterUrl);
    
    if (jupiterRes.ok) {
      const jupiterData = await jupiterRes.json();
      
      if (jupiterData.data && jupiterData.data[baseToken.address] && jupiterData.data[quoteToken.address]) {
        const basePrice = jupiterData.data[baseToken.address].price;
        const quotePrice = jupiterData.data[quoteToken.address].price;
        const price = basePrice / quotePrice;
        
        prices['jupiter'] = {
          price,
          liquidity: 2000000, // Estimated liquidity in USD
          timestamp: Date.now()
        };
        
        // Add simulated prices for other Solana DEXes with slight variations
        prices['orca'] = {
          price: price * (0.99 + Math.random() * 0.02), // +/- 1%
          liquidity: 1500000,
          timestamp: Date.now()
        };
        
        prices['raydium'] = {
          price: price * (0.98 + Math.random() * 0.04), // +/- 2%
          liquidity: 1200000,
          timestamp: Date.now()
        };
      }
    }
  } catch (error) {
    console.error('Error fetching Solana prices:', error);
  }
  
  return prices;
}

async function fetchEVMPrices(baseToken: any, quoteToken: any): Promise<Record<string, any>> {
  const prices: Record<string, any> = {};
  
  try {
    // 1inch API for aggregated price data
    const chainId = baseToken.chainId;
    
    // Try to use 1inch API if possible
    try {
      const oneInchUrl = `https://api.1inch.io/v5.0/${chainId}/quote?fromTokenAddress=${baseToken.address}&toTokenAddress=${quoteToken.address}&amount=1000000000000000000`; // 1 token
      console.log(`Fetching EVM prices from 1inch: ${oneInchUrl}`);
      
      const oneInchRes = await fetch(oneInchUrl);
      
      if (oneInchRes.ok) {
        const oneInchData = await oneInchRes.json();
        
        const fromAmount = parseInt(oneInchData.fromTokenAmount) / Math.pow(10, baseToken.decimals || 18);
        const toAmount = parseInt(oneInchData.toTokenAmount) / Math.pow(10, quoteToken.decimals || 18);
        const price = toAmount / fromAmount;
        
        prices['1inch'] = {
          price,
          liquidity: 3000000, // Estimated liquidity
          timestamp: Date.now()
        };
        
        // Add simulated prices for other DEXes with slight variations
        if (chainId === 1) { // Ethereum
          prices['uniswap'] = {
            price: price * (0.99 + Math.random() * 0.02), // +/- 1%
            liquidity: 5000000,
            timestamp: Date.now()
          };
          
          prices['sushiswap'] = {
            price: price * (0.98 + Math.random() * 0.04), // +/- 2%
            liquidity: 2000000,
            timestamp: Date.now()
          };
          
          prices['curve'] = {
            price: price * (0.995 + Math.random() * 0.01), // +/- 0.5%
            liquidity: 8000000,
            timestamp: Date.now()
          };
        } else if (chainId === 56) { // BSC
          prices['pancakeswap'] = {
            price: price * (0.99 + Math.random() * 0.02), // +/- 1%
            liquidity: 3000000,
            timestamp: Date.now()
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching 1inch price for chain ${chainId}:`, error);
    }
    
    // Fallback to CoinGecko for generic prices if needed
    if (Object.keys(prices).length === 0) {
      try {
        console.log('Falling back to CoinGecko for generic prices');
        const cgIds = {
          'ETH': 'ethereum',
          'WETH': 'ethereum',
          'BNB': 'binancecoin',
          'WBNB': 'binancecoin',
          'SOL': 'solana',
          'USDC': 'usd-coin',
          'USDT': 'tether',
          'DAI': 'dai'
        };
        
        const baseId = cgIds[baseToken.symbol] || baseToken.symbol.toLowerCase();
        const quoteId = cgIds[quoteToken.symbol] || quoteToken.symbol.toLowerCase();
        
        const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${baseId},${quoteId}&vs_currencies=usd`;
        const cgRes = await fetch(cgUrl);
        
        if (cgRes.ok) {
          const cgData = await cgRes.json();
          
          if (cgData[baseId] && cgData[quoteId]) {
            const basePrice = cgData[baseId].usd;
            const quotePrice = cgData[quoteId].usd;
            const price = basePrice / quotePrice;
            
            prices['coingecko'] = {
              price,
              liquidity: 5000000,
              timestamp: Date.now()
            };
          }
        }
      } catch (error) {
        console.error('Error fetching CoinGecko prices:', error);
      }
    }
  } catch (error) {
    console.error('Error in fetchEVMPrices:', error);
  }
  
  return prices;
}
