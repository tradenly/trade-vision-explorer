
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define interfaces for our request and response objects
interface ArbitrageScanRequest {
  baseToken: any;
  quoteToken: any;
  investmentAmount: number;
  minProfitPercentage: number;
}

interface ArbitrageOpportunity {
  id: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  liquidityBuy: number;
  liquiditySell: number;
  tradingFeeBuy: number;
  tradingFeeSell: number;
  gasFee: number;
  netProfit: number;
  profitPercentage: number;
  network: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define DEX rate limits to avoid API bans
const dexRateLimits = {
  uniswap: { maxRequests: 10, timeWindow: 10000 }, // 10 requests per 10 seconds
  sushiswap: { maxRequests: 10, timeWindow: 10000 },
  balancer: { maxRequests: 10, timeWindow: 10000 },
  curve: { maxRequests: 10, timeWindow: 10000 },
  jupiter: { maxRequests: 3, timeWindow: 1000 }, // 3 requests per second for Solana APIs
  orca: { maxRequests: 3, timeWindow: 1000 },
  raydium: { maxRequests: 3, timeWindow: 1000 },
};

// Rate limiter class to enforce rate limits
class RateLimiter {
  private requests: Record<string, number[]> = {};

  checkLimit(dex: string): boolean {
    const now = Date.now();
    const limit = dexRateLimits[dex as keyof typeof dexRateLimits] || { maxRequests: 5, timeWindow: 1000 };
    
    if (!this.requests[dex]) {
      this.requests[dex] = [now];
      return true;
    }
    
    // Filter out requests older than the time window
    this.requests[dex] = this.requests[dex].filter(time => now - time < limit.timeWindow);
    
    // Check if we've hit the limit
    if (this.requests[dex].length >= limit.maxRequests) {
      return false;
    }
    
    // Add current request timestamp
    this.requests[dex].push(now);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Estimate chain-specific gas fees
function estimateGasFee(chainId: number): number {
  switch(chainId) {
    case 1: // Ethereum
      return 0.005; // $5 in gas
    case 56: // BSC
      return 0.0005; // $0.50 in gas
    case 137: // Polygon
      return 0.001; // $1 in gas
    case 42161: // Arbitrum
      return 0.0015; // $1.50 in gas
    case 10: // Optimism
      return 0.001; // $1 in gas
    case 8453: // Base
      return 0.001; // $1 in gas
    case 101: // Solana
      return 0.0001; // $0.10 in gas
    default:
      return 0.002; // Default gas estimate
  }
}

// Get network name from chain ID
function getNetworkFromChainId(chainId: number): string {
  switch(chainId) {
    case 1: return "ethereum";
    case 56: return "bnb";
    case 101: return "solana";
    case 137: return "polygon";
    case 42161: return "arbitrum";
    case 10: return "optimism";
    case 8453: return "base";
    default: return "unknown";
  }
}

// Fetch real DEX prices for token pair using 1inch API for EVM chains
async function fetchEVMDexPrices(baseToken: any, quoteToken: any, chainId: number): Promise<any[]> {
  try {
    // First, check the database for recent cached prices (within the last 5 minutes)
    const { data: cachedPrices } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
      .eq('chain_id', chainId)
      .gt('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });
    
    if (cachedPrices && cachedPrices.length > 0) {
      console.log(`Using cached prices for ${baseToken.symbol}/${quoteToken.symbol}`);
      return cachedPrices;
    }
    
    // If no recent cached prices, try to fetch from APIs with rate limiting
    const dexes = ['uniswap', 'sushiswap', 'curve', 'balancer'];
    const prices = [];
    
    for (const dex of dexes) {
      if (!rateLimiter.checkLimit(dex)) {
        console.log(`Rate limit reached for ${dex}, skipping...`);
        continue;
      }
      
      try {
        // For Ethereum, we can use 1inch API to get quotes from different liquidity sources
        if (chainId === 1) {
          const response = await fetch(`https://api.1inch.io/v5.0/${chainId}/quote?fromTokenAddress=${baseToken.address}&toTokenAddress=${quoteToken.address}&amount=1000000000000000000&protocols=${dex.toUpperCase()}`);
          
          if (response.ok) {
            const data = await response.json();
            const price = parseFloat(data.toTokenAmount) / parseFloat(data.fromTokenAmount);
            
            // Save to Supabase for future use
            await supabase.from('dex_price_history').insert({
              dex_name: dex,
              token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
              chain_id: chainId,
              price: price
            });
            
            prices.push({
              dex_name: dex,
              price: price,
              liquidity: 100000, // Placeholder, would need to fetch actual liquidity
              token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
              chain_id: chainId,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${dex}:`, error);
      }
    }
    
    // If we couldn't get real prices, use simulated ones
    if (prices.length === 0) {
      return generateSimulatedPrices(baseToken, quoteToken, chainId);
    }
    
    return prices;
  } catch (error) {
    console.error('Error fetching EVM DEX prices:', error);
    return generateSimulatedPrices(baseToken, quoteToken, chainId);
  }
}

// Generate simulated prices when real API calls fail
function generateSimulatedPrices(baseToken: any, quoteToken: any, chainId: number): any[] {
  console.log(`Generating simulated prices for ${baseToken.symbol}/${quoteToken.symbol}`);
  
  // Base price for the token pair
  const basePrice = chainId === 1 ? 
    (baseToken.symbol === 'ETH' ? 3500 : Math.random() * 100) : 
    chainId === 101 ? 
      (baseToken.symbol === 'SOL' ? 150 : Math.random() * 50) :
      Math.random() * 10;
  
  // Generate slightly different prices for each DEX
  const dexes = ['uniswap', 'sushiswap', 'balancer', 'curve', 'pancakeswap'];
  const simulatedData = [];
  
  for (const dex of dexes) {
    // Skip dexes that don't match the chain
    if ((chainId === 56 && dex !== 'pancakeswap') || 
        (chainId === 101 && !['jupiter', 'orca', 'raydium'].includes(dex)) ||
        (chainId === 1 && dex === 'pancakeswap')) {
      continue;
    }
    
    // Variation of +/- 2%
    const priceVariation = 0.98 + Math.random() * 0.04;
    const price = basePrice * priceVariation;
    
    simulatedData.push({
      dex_name: dex,
      token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
      chain_id: chainId,
      price: price,
      liquidityUSD: 1000000 + Math.random() * 9000000,
      timestamp: new Date().toISOString()
    });
  }
  
  return simulatedData;
}

// Fetch quotes from DEXes for the given token pair
async function fetchDexQuotes(baseToken: any, quoteToken: any): Promise<any[]> {
  try {
    if (baseToken.chainId === 101) {
      // TODO: Add code for Solana DEXes when implemented
      return generateSimulatedPrices(baseToken, quoteToken, baseToken.chainId);
    } else {
      // For EVM chains
      return fetchEVMDexPrices(baseToken, quoteToken, baseToken.chainId);
    }
  } catch (error) {
    console.error('Error in fetchDexQuotes:', error);
    return generateSimulatedPrices(baseToken, quoteToken, baseToken.chainId);
  }
}

// Find arbitrage opportunities by comparing prices across DEXes
function findArbitrageOpportunities(
  quotes: any[], 
  baseToken: any, 
  quoteToken: any, 
  investmentAmount: number,
  minProfitPercentage: number
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  const gasFee = estimateGasFee(baseToken.chainId);
  const processedPairs = new Set();
  
  // Group quotes by DEX
  const dexQuotes: Record<string, any> = {};
  quotes.forEach(quote => {
    if (!dexQuotes[quote.dex_name]) {
      dexQuotes[quote.dex_name] = quote;
    }
  });
  
  // Compare each DEX with every other DEX
  const dexNames = Object.keys(dexQuotes);
  
  for (let i = 0; i < dexNames.length; i++) {
    const buyDex = dexNames[i];
    const buyData = dexQuotes[buyDex];
    const buyPrice = buyData.price;
    
    for (let j = 0; j < dexNames.length; j++) {
      if (i === j) continue; // Skip same DEX
      
      const sellDex = dexNames[j];
      const sellData = dexQuotes[sellDex];
      const sellPrice = sellData.price;
      
      const pairKey = `${buyDex}-${sellDex}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      
      // Calculate potential profit
      if (sellPrice > buyPrice) {
        const buyAmount = investmentAmount / buyPrice;
        const tradingFeeBuy = investmentAmount * 0.003; // Assume 0.3% trading fee
        const tradingFeeSell = sellPrice * buyAmount * 0.003;
        
        const sellAmount = buyAmount * sellPrice;
        const grossProfit = sellAmount - investmentAmount;
        const netProfit = grossProfit - gasFee - tradingFeeBuy - tradingFeeSell;
        const profitPercentage = (netProfit / investmentAmount) * 100;
        
        // Check if profit meets minimum threshold
        if (profitPercentage >= minProfitPercentage) {
          // Define reasonable liquidity values (these would normally come from the DEXes)
          const liquidityBuy = buyData.liquidityUSD || 100000;
          const liquiditySell = sellData.liquidityUSD || 100000;
          
          opportunities.push({
            id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
            buyDex,
            sellDex,
            buyPrice,
            sellPrice,
            liquidityBuy,
            liquiditySell,
            tradingFeeBuy,
            tradingFeeSell,
            gasFee,
            netProfit,
            profitPercentage,
            network: getNetworkFromChainId(baseToken.chainId)
          });
        }
      }
    }
  }
  
  // Sort opportunities by profit percentage (highest first)
  return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
}

// Main function to scan for arbitrage opportunities
async function scanForArbitrageOpportunities(
  baseToken: any, 
  quoteToken: any,
  investmentAmount: number,
  minProfitPercentage: number
): Promise<ArbitrageOpportunity[]> {
  try {
    // Fetch quotes from DEXes
    const quotes = await fetchDexQuotes(baseToken, quoteToken);
    
    if (!quotes.length) {
      console.log('No quotes found for', baseToken.symbol, quoteToken.symbol);
      return [];
    }
    
    // Find arbitrage opportunities
    const opportunities = findArbitrageOpportunities(
      quotes, 
      baseToken, 
      quoteToken, 
      investmentAmount,
      minProfitPercentage
    );
    
    // Store opportunities in the database for tracking
    if (opportunities.length > 0) {
      for (const opp of opportunities) {
        await supabase.from('arbitrage_opportunities').upsert({
          network: opp.network,
          token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
          buy_exchange: opp.buyDex,
          sell_exchange: opp.sellDex,
          price_diff: opp.sellPrice - opp.buyPrice,
          estimated_profit: opp.netProfit.toFixed(2),
          risk: opp.profitPercentage < 1 ? 'high' : opp.profitPercentage < 3 ? 'medium' : 'low',
          status: 'active'
        }, { onConflict: 'token_pair, buy_exchange, sell_exchange' });
      }
    }
    
    return opportunities;
  } catch (error) {
    console.error('Error scanning for arbitrage:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, investmentAmount = 1000, minProfitPercentage = 0.5 } = await req.json() as ArbitrageScanRequest;
    
    if (!baseToken || !quoteToken) {
      return new Response(JSON.stringify({ error: "Missing token information" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} on chain ${baseToken.chainId}`);
    
    // Scan for arbitrage opportunities
    const opportunities = await scanForArbitrageOpportunities(
      baseToken, 
      quoteToken, 
      investmentAmount,
      minProfitPercentage
    );
    
    console.log(`Found ${opportunities.length} arbitrage opportunities`);
    
    return new Response(JSON.stringify({ opportunities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
