
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping of chain IDs to network names
const CHAIN_NETWORK_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bnb',
  101: 'solana',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base'
};

// Function to get gas fees for a specific network
async function getNetworkGasFees(network: string) {
  try {
    const { data, error } = await supabase
      .from('gas_fees')
      .select('*')
      .eq('network', network)
      .single();

    if (error) {
      console.error(`Error fetching gas fees for ${network}:`, error);
      // Default values if not found
      return { 
        base_fee: network === 'solana' ? 0.000005 : 2.5, 
        priority_fee: 0, 
        is_lamports: network === 'solana',
        compute_units: network === 'solana' ? 200000 : undefined 
      };
    }

    return data;
  } catch (error) {
    console.error(`Error in getNetworkGasFees for ${network}:`, error);
    return { 
      base_fee: network === 'solana' ? 0.000005 : 2.5, 
      priority_fee: 0, 
      is_lamports: network === 'solana',
      compute_units: network === 'solana' ? 200000 : undefined
    };
  }
}

// Function to get DEX settings for a specific chain
async function getDexSettingsForChain(chainId: number) {
  try {
    const { data, error } = await supabase
      .from('dex_settings')
      .select('*')
      .contains('chain_ids', [chainId])
      .eq('enabled', true);

    if (error) {
      console.error(`Error fetching DEX settings for chain ${chainId}:`, error);
      return [];
    }

    return data;
  } catch (error) {
    console.error(`Error in getDexSettingsForChain(${chainId}):`, error);
    return [];
  }
}

// Calculate gas fee for a specific network
function calculateGasFeeUSD(network: string, gasData: any): number {
  if (network === 'solana') {
    // Solana gas fee calculation
    // Base fee of 5000 lamports per signature (typically 1-2 signatures)
    // 1 SOL = 1,000,000,000 lamports
    // Compute units also factor in
    const signatures = 2; // Buy and sell transactions
    const baseFeeInLamports = 5000 * signatures;
    
    // Priority fee is optional and based on network congestion
    // computeUnits * priorityFeeInMicroLamports
    const computeUnits = gasData.compute_units || 200000;
    const priorityFeeInMicroLamports = (gasData.priority_fee || 0) * 1000000;
    
    const priorityFeeInLamports = (computeUnits * priorityFeeInMicroLamports) / 1000000;
    const totalFeeInLamports = baseFeeInLamports + priorityFeeInLamports;
    
    // Convert lamports to SOL
    const totalFeeInSOL = totalFeeInLamports / 1000000000;
    
    // Assuming SOL price around $150
    const solPrice = 150;
    return totalFeeInSOL * solPrice;
  } else if (network === 'ethereum') {
    // ETH gas calculation - higher than other EVM chains
    const gasUnits = 150000; // Typical DEX swap gas usage
    const gasPriceGwei = gasData.base_fee || 50; // Gwei
    const ethPriceUSD = 3500; // Estimated ETH price
    return (gasUnits * gasPriceGwei * 1e-9) * ethPriceUSD;
  } else if (network === 'bnb') {
    // BNB gas calculation - typically cheaper than Ethereum
    const gasUnits = 150000; 
    const gasPriceGwei = gasData.base_fee || 5; // BNB gas is much cheaper
    const bnbPriceUSD = 550;
    return (gasUnits * gasPriceGwei * 1e-9) * bnbPriceUSD;
  } else if (network === 'polygon') {
    // Polygon gas calculation
    const gasUnits = 150000;
    const gasPriceGwei = gasData.base_fee || 30;
    const maticPriceUSD = 1;
    return (gasUnits * gasPriceGwei * 1e-9) * maticPriceUSD;
  } else if (network === 'arbitrum' || network === 'optimism' || network === 'base') {
    // L2 gas calculation - typically cheaper than Ethereum
    const gasUnits = 150000;
    const gasPriceGwei = gasData.base_fee || 0.1;
    const ethPriceUSD = 3500;
    return (gasUnits * gasPriceGwei * 1e-9) * ethPriceUSD;
  } else {
    // Default EVM chain calculation
    return gasData.base_fee || 2.5;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseToken, quoteToken, investmentAmount = 1000, minProfitPercentage = 0.5 } = await req.json();
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol} with $${investmentAmount}`);
    console.log(`Selected chain ID: ${baseToken.chainId}`);

    // Get network name from chain ID
    const networkName = CHAIN_NETWORK_MAP[baseToken.chainId] || 'ethereum';
    console.log(`Network identified: ${networkName}`);

    // Get gas fees for the network
    const gasFees = await getNetworkGasFees(networkName);
    console.log(`Gas fees for ${networkName}:`, gasFees);

    // Get enabled DEXs for this chain
    const dexSettings = await getDexSettingsForChain(baseToken.chainId);
    console.log(`Found ${dexSettings.length} DEXs for chain ${baseToken.chainId}`);

    // Fetch scan settings
    const { data: scanSettings, error: scanSettingsError } = await supabase
      .from('scan_settings')
      .select('*')
      .single();

    if (scanSettingsError) {
      console.error('Error fetching scan settings:', scanSettingsError);
      throw scanSettingsError;
    }
    
    // Use the appropriate scan settings
    const profitThreshold = scanSettings?.profit_threshold || minProfitPercentage;
    const gasThreshold = scanSettings?.gas_fee_threshold || 5.0;

    // Generate arbitrage opportunities (placeholder logic)
    // In a real implementation, this would fetch actual prices from DEX APIs
    const opportunities = [];
    for (let i = 0; i < dexSettings.length; i++) {
      const buyDex = dexSettings[i];
      
      for (let j = 0; j < dexSettings.length; j++) {
        if (i === j) continue; // Skip same DEX comparison
        
        const sellDex = dexSettings[j];
        
        // Simulated price difference calculation
        // For each pair of DEXs, we'll create a random price spread
        // In production, we'd use real API calls to DEXes
        let buyPrice, sellPrice;
        
        if (networkName === 'solana') {
          buyPrice = (baseToken.symbol === 'SOL') ? 150 + (Math.random() * 5 - 2.5) : 1 + (Math.random() * 0.2 - 0.1);
          // Create a small price difference - sometimes positive, sometimes negative
          const priceDiff = (Math.random() * 0.06) - 0.01; // Between -1% and +5%
          sellPrice = buyPrice * (1 + priceDiff);
        } else if (networkName === 'ethereum') {
          // ETH prices tend to have tighter spreads
          buyPrice = (baseToken.symbol === 'ETH') ? 3500 + (Math.random() * 35 - 17.5) : 10 + (Math.random() * 0.5 - 0.25);
          const priceDiff = (Math.random() * 0.04) - 0.01; // Tighter spread
          sellPrice = buyPrice * (1 + priceDiff);
        } else {
          // EVM chains
          buyPrice = (baseToken.symbol === 'ETH') ? 3500 + (Math.random() * 50 - 25) : 
                     (baseToken.symbol === 'BNB') ? 550 + (Math.random() * 10 - 5) : 
                     10 + (Math.random() * 1 - 0.5);
          
          const priceDiff = (Math.random() * 0.08) - 0.02; // Between -2% and +6%
          sellPrice = buyPrice * (1 + priceDiff);
        }
        
        // Basic profit calculation
        const tradingFeeBuy = investmentAmount * (buyDex.trading_fee_percentage / 100);
        const tradingFeeSell = investmentAmount * (sellDex.trading_fee_percentage / 100);
        
        const tokenAmount = (investmentAmount - tradingFeeBuy) / buyPrice;
        const saleAmount = tokenAmount * sellPrice;
        
        // Calculate gas fee based on network
        const gasFeeUSD = calculateGasFeeUSD(networkName, gasFees);
        
        // Calculate net profit after all fees
        const tradingFees = tradingFeeBuy + tradingFeeSell;
        const platformFee = investmentAmount * 0.005; // 0.5% platform fee
        const netProfit = saleAmount - investmentAmount - tradingFees - gasFeeUSD - platformFee;
        const profitPercentage = (netProfit / investmentAmount) * 100;
        
        // Generate liquidity estimates (simulated)
        const liquidityBuy = Math.floor(50000 + Math.random() * 950000);
        const liquiditySell = Math.floor(50000 + Math.random() * 950000);
        
        // Calculate price difference for storing in database
        const priceDifference = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        // Only include profitable opportunities meeting the threshold
        if (profitPercentage >= profitThreshold && gasFeeUSD <= gasThreshold) {
          const opportunityId = crypto.randomUUID();
          
          // Add opportunity to array
          opportunities.push({
            id: opportunityId,
            buyDex: buyDex.name,
            sellDex: sellDex.name,
            buyPrice: parseFloat(buyPrice.toFixed(4)),
            sellPrice: parseFloat(sellPrice.toFixed(4)),
            profitPercentage: parseFloat(profitPercentage.toFixed(2)),
            netProfit: parseFloat(netProfit.toFixed(2)),
            tradingFeeBuy: parseFloat(tradingFeeBuy.toFixed(2)),
            tradingFeeSell: parseFloat(tradingFeeSell.toFixed(2)),
            gasFee: parseFloat(gasFeeUSD.toFixed(4)),
            platformFee: parseFloat(platformFee.toFixed(2)),
            liquidityBuy,
            liquiditySell,
            network: networkName,
            token: baseToken.symbol,
            priceDiff: parseFloat(priceDifference.toFixed(2))
          });
          
          // Store in database
          try {
            const { error: storeError } = await supabase
              .from('arbitrage_opportunities')
              .insert({
                id: opportunityId,
                token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
                buy_exchange: buyDex.name,
                sell_exchange: sellDex.name,
                estimated_profit: netProfit.toFixed(2),
                network: networkName,
                status: 'active',
                price_diff: priceDifference,
                risk: profitPercentage > 3 ? 'low' : profitPercentage > 1 ? 'medium' : 'high'
              });

            if (storeError) {
              console.error('Error storing arbitrage opportunity:', storeError);
            }
          } catch (storeError) {
            console.error('Exception storing arbitrage opportunity:', storeError);
          }
        }
      }
    }

    // Sort opportunities by profit percentage (highest first)
    opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);

    // Limit to top 10 opportunities
    const topOpportunities = opportunities.slice(0, 10);

    return new Response(JSON.stringify({ opportunities: topOpportunities }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error scanning for arbitrage:", error);
    return new Response(JSON.stringify({ error: error.message, opportunities: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
