
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { UniswapAdapter } from "./dex-adapters/uniswap.ts"
import { PancakeSwapAdapter } from "./dex-adapters/pancakeswap.ts"
import { SushiswapAdapter } from "./dex-adapters/sushiswap.ts"
import { JupiterAdapter } from "./dex-adapters/jupiter.ts"
import { OrcaAdapter } from "./dex-adapters/orca.ts"
import { RaydiumAdapter } from "./dex-adapters/raydium.ts"
import { TokenPair } from "./types.ts"
import { PriceValidation } from "./utils/price-validation.ts"
import { rateLimiter } from "./utils/rate-limiter.ts"

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DURATION = 30000; // 30 seconds
const priceCache = new Map();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken } = await req.json();
    
    if (!baseToken?.address || !quoteToken?.address || !baseToken.chainId) {
      throw new Error('Missing token information');
    }

    const cacheKey = `${baseToken.address}-${quoteToken.address}-${baseToken.chainId}`;
    const cachedData = priceCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize adapters based on chain type
    const adapters = [];
    
    // Use chainId to determine which adapters to use
    if (baseToken.chainId === 101) { // Solana
      adapters.push(new JupiterAdapter());
      adapters.push(new OrcaAdapter());
      adapters.push(new RaydiumAdapter());
    } else { // EVM chains
      adapters.push(new UniswapAdapter());
      adapters.push(new SushiswapAdapter());
      
      if (baseToken.chainId === 56 || baseToken.chainId === 1) { // BSC or ETH
        adapters.push(new PancakeSwapAdapter());
      }
    }

    if (adapters.length === 0) {
      throw new Error(`No compatible price adapters available for chain ${baseToken.chainId}`);
    }

    console.log(`Fetching prices for ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);

    // Wait for rate limiter slot to avoid API throttling
    await rateLimiter.waitForSlot();

    // Fetch prices from all adapters (in parallel)
    const pricePromises = adapters.map(adapter => 
      adapter.getPrice(baseToken.address, quoteToken.address, baseToken.chainId)
    );

    const results = await Promise.allSettled(pricePromises);
    const prices = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const quote = result.value;
        
        // Validate the price quote
        const isValid = PriceValidation.validateQuote({
          dexName: adapters[index].getName(),
          price: quote.price,
          liquidityUSD: quote.liquidity,
          timestamp: quote.timestamp
        });
        
        if (isValid) {
          prices[adapters[index].getName().toLowerCase()] = quote;
        }
      }
    });

    // Add mock data for debugging if no live prices
    if (Object.keys(prices).length === 0) {
      // Use fallback from database or generate mock data
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      const { data: dbPrices } = await supabase
        .from('dex_price_history')
        .select('*')
        .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
        .eq('chain_id', baseToken.chainId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (dbPrices && dbPrices.length > 0) {
        // Use historical data
        dbPrices.forEach(record => {
          if (!prices[record.dex_name]) {
            prices[record.dex_name] = {
              source: record.dex_name,
              price: record.price,
              timestamp: new Date(record.timestamp).getTime(),
              liquidity: record.liquidity || 100000,
              tradingFee: 0.003,
              isFallback: true
            };
          }
        });
      } else if (baseToken.chainId === 1) {
        // Generate mock data for Ethereum
        const basePrice = baseToken.symbol === 'ETH' ? 3500 : 50000;
        
        prices['uniswap'] = {
          source: 'uniswap',
          price: basePrice * (0.99 + Math.random() * 0.02),
          timestamp: Date.now(),
          liquidity: 5000000,
          tradingFee: 0.003,
          isMock: true
        };
        
        prices['sushiswap'] = {
          source: 'sushiswap',
          price: basePrice * (0.98 + Math.random() * 0.04),
          timestamp: Date.now(),
          liquidity: 3000000,
          tradingFee: 0.003,
          isMock: true
        };
      } else if (baseToken.chainId === 101) {
        // Generate mock data for Solana
        const basePrice = baseToken.symbol === 'SOL' ? 140 : 50000;
        
        prices['jupiter'] = {
          source: 'jupiter',
          price: basePrice * (0.99 + Math.random() * 0.02),
          timestamp: Date.now(),
          liquidity: 2000000,
          tradingFee: 0.0035,
          isMock: true
        };
        
        prices['raydium'] = {
          source: 'raydium',
          price: basePrice * (0.98 + Math.random() * 0.04),
          timestamp: Date.now(),
          liquidity: 1500000,
          tradingFee: 0.003,
          isMock: true
        };
      }
    }

    // Store the real price data we collected in the database
    if (Object.keys(prices).length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const timestamp = new Date().toISOString();
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      
      // Only store real (non-mock, non-fallback) prices
      const priceRecords = Object.entries(prices)
        .filter(([_, data]) => !data.isMock && !data.isFallback)
        .map(([dexName, data]) => ({
          dex_name: dexName,
          token_pair: tokenPair,
          price: data.price,
          chain_id: baseToken.chainId,
          liquidity: data.liquidity || null,
          timestamp: timestamp
        }));
      
      if (priceRecords.length > 0) {
        await supabase.from('dex_price_history').insert(priceRecords);
      }
    }

    // Update cache
    const responseData = { prices, timestamp: Date.now() };
    priceCache.set(cacheKey, responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in fetch-prices:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
