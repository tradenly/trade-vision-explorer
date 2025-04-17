
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract request body
    const { 
      baseToken, 
      quoteToken, 
      minProfitPercentage = 0.5, 
      investmentAmount = 1000,
      maxAgeSeconds = 30 
    } = await req.json();

    if (!baseToken || !quoteToken) {
      return new Response(
        JSON.stringify({ error: 'Base and quote tokens are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recent prices from database
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
    const minTimestamp = new Date(Date.now() - (maxAgeSeconds * 1000)).toISOString();

    const { data: prices, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', tokenPair)
      .eq('chain_id', baseToken.chainId)
      .gt('timestamp', minTimestamp)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!prices || prices.length < 2) {
      return new Response(
        JSON.stringify({ 
          message: 'Not enough price data available',
          opportunities: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group prices by DEX (using most recent price for each)
    const latestPricesByDex = new Map();
    prices.forEach(price => {
      if (!latestPricesByDex.has(price.dex_name)) {
        latestPricesByDex.set(price.dex_name, price);
      }
    });

    const opportunities = [];
    const priceEntries = Array.from(latestPricesByDex.entries());

    // Compare prices between DEXes
    for (let i = 0; i < priceEntries.length; i++) {
      for (let j = i + 1; j < priceEntries.length; j++) {
        const [dex1, price1] = priceEntries[i];
        const [dex2, price2] = priceEntries[j];

        const priceDiff = Math.abs(price1.price - price2.price);
        const avgPrice = (price1.price + price2.price) / 2;
        const profitPercentage = (priceDiff / avgPrice) * 100;

        if (profitPercentage >= minProfitPercentage) {
          const [buyDex, sellDex, buyPrice, sellPrice] = 
            price1.price < price2.price 
              ? [dex1, dex2, price1.price, price2.price]
              : [dex2, dex1, price2.price, price1.price];

          // Calculate fees and profits
          const tradingFees = calculateTradingFees(investmentAmount, buyDex, sellDex);
          const platformFee = calculatePlatformFee(investmentAmount);
          const gasFee = estimateGasFee(baseToken.chainId);
          
          const buyGasFee = gasFee * 0.6; // 60% of gas for buy transaction
          const sellGasFee = gasFee * 0.4; // 40% of gas for sell transaction
          
          const estimatedProfit = investmentAmount * (sellPrice - buyPrice) / buyPrice;
          const netProfit = estimatedProfit - tradingFees - platformFee - buyGasFee - sellGasFee;
          const netProfitPercentage = (netProfit / investmentAmount) * 100;
          
          // Only include if net profit is positive
          if (netProfit > 0) {
            const opportunity = {
              id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
              tokenPair,
              token: baseToken.symbol,
              network: getNetworkName(baseToken.chainId),
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              priceDifferencePercentage: profitPercentage,
              liquidity: Math.min(price1.liquidity || 0, price2.liquidity || 0),
              estimatedProfit,
              estimatedProfitPercentage: profitPercentage,
              gasFee,
              netProfit,
              netProfitPercentage,
              baseToken,
              quoteToken,
              timestamp: Date.now(),
              buyGasFee,
              sellGasFee,
              tradingFees,
              platformFee,
              investmentAmount
            };

            opportunities.push(opportunity);
          }
        }
      }
    }

    // Store opportunities in the database
    if (opportunities.length > 0) {
      await supabase
        .from('arbitrage_opportunities')
        .insert(opportunities.map(opp => ({
          network: opp.network,
          token_pair: opp.tokenPair,
          buy_exchange: opp.buyDex,
          sell_exchange: opp.sellDex,
          price_diff: opp.priceDifferencePercentage,
          estimated_profit: opp.netProfit.toFixed(2),
          risk: calculateRiskLevel(opp.netProfitPercentage),
          status: 'active'
        })));
    }

    return new Response(
      JSON.stringify({ opportunities }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in scan-arbitrage function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    1: 'ethereum',
    56: 'bnb',
    137: 'polygon',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    101: 'solana'
  };
  return networks[chainId] || 'unknown';
}

function estimateGasFee(chainId: number): number {
  const gasFees: Record<number, number> = {
    1: 0.005, // ETH gas estimate
    56: 0.0005, // BSC gas estimate
    137: 0.001, // Polygon gas estimate
    42161: 0.002, // Arbitrum gas estimate
    10: 0.001, // Optimism gas estimate
    8453: 0.001, // Base gas estimate
    101: 0.00001 // Solana gas estimate
  };
  return gasFees[chainId] || 0.003;
}

function calculateTradingFees(investmentAmount: number, dex1: string, dex2: string): number {
  const feeRates: Record<string, number> = {
    uniswap: 0.003, // 0.3%
    sushiswap: 0.003, // 0.3%
    pancakeswap: 0.0025, // 0.25%
    jupiter: 0.0035, // 0.35%
    orca: 0.003, // 0.3%
    raydium: 0.003, // 0.3%
    balancer: 0.002, // 0.2%
    curve: 0.0004 // 0.04%
  };
  
  const dex1Fee = feeRates[dex1.toLowerCase()] || 0.003;
  const dex2Fee = feeRates[dex2.toLowerCase()] || 0.003;
  
  return investmentAmount * (dex1Fee + dex2Fee);
}

function calculatePlatformFee(investmentAmount: number): number {
  const platformFeeRate = 0.005; // 0.5%
  return investmentAmount * platformFeeRate;
}

function calculateRiskLevel(profitPercentage: number): string {
  if (profitPercentage >= 2) return 'low';
  if (profitPercentage >= 1) return 'medium';
  return 'high';
}
