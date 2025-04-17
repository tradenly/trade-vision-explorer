
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
    console.log(`Fetching gas fees for network: ${network}`);
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
        priority_fee: network === 'solana' ? 0.000001 : 0, 
        is_lamports: network === 'solana',
        compute_units: network === 'solana' ? 200000 : undefined 
      };
    }

    console.log(`Gas fees for ${network}:`, data);
    return data;
  } catch (error) {
    console.error(`Error in getNetworkGasFees for ${network}:`, error);
    return { 
      base_fee: network === 'solana' ? 0.000005 : 2.5, 
      priority_fee: network === 'solana' ? 0.000001 : 0, 
      is_lamports: network === 'solana',
      compute_units: network === 'solana' ? 200000 : undefined
    };
  }
}

// Function to get DEX settings for a specific chain
async function getDexSettingsForChain(chainId: number) {
  try {
    console.log(`Fetching DEX settings for chain ${chainId}`);
    const { data, error } = await supabase
      .from('dex_settings')
      .select('*')
      .contains('chain_ids', [chainId])
      .eq('enabled', true);

    if (error) {
      console.error(`Error fetching DEX settings for chain ${chainId}:`, error);
      return [];
    }

    console.log(`Found ${data?.length || 0} DEX settings for chain ${chainId}`);
    return data || [];
  } catch (error) {
    console.error(`Error in getDexSettingsForChain(${chainId}):`, error);
    return [];
  }
}

// Function to fetch real token prices from external APIs when possible
async function fetchTokenPrice(tokenSymbol: string, network: string): Promise<number | null> {
  try {
    // Use a free API endpoint that doesn't require authentication
    // CoinGecko public API is a good option for this purpose
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenSymbol.toLowerCase()}&vs_currencies=usd`;
    console.log(`Fetching price for ${tokenSymbol} from CoinGecko`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data[tokenSymbol.toLowerCase()]?.usd) {
      const price = data[tokenSymbol.toLowerCase()].usd;
      console.log(`Got price for ${tokenSymbol}: $${price}`);
      return price;
    }
    
    throw new Error('Price not found in response');
  } catch (error) {
    console.error(`Error fetching price for ${tokenSymbol}:`, error);
    return null;
  }
}

// Calculate gas fee for a specific network
function calculateGasFeeUSD(network: string, gasData: any): number {
  if (network === 'solana') {
    // Solana gas fee calculation using lamports
    // Base fee of 5,000 lamports per signature (typically 1-2 signatures)
    // 1 SOL = 1,000,000,000 lamports
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
    
    // Get SOL price (ideally from an external API)
    const solPrice = 150; // Estimated SOL price, would be better to fetch from API
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

// Create a unique ID for each opportunity
function generateOpportunityId(): string {
  return crypto.randomUUID();
}

// Calculate the estimated profit for an arbitrage opportunity
function calculateProfit(
  buyPrice: number, 
  sellPrice: number, 
  investmentAmount: number, 
  tradingFeeBuyPct: number, 
  tradingFeeSellPct: number, 
  gasFeeUSD: number,
  platformFeePct: number = 0.5 // Default 0.5% platform fee
): { 
  netProfit: number, 
  profitPercentage: number, 
  tradingFeeBuy: number,
  tradingFeeSell: number,
  platformFee: number
} {
  // Calculate trading fees
  const tradingFeeBuy = investmentAmount * (tradingFeeBuyPct / 100);
  const tradingFeeSell = investmentAmount * (tradingFeeSellPct / 100);
  
  // Calculate token amounts
  const tokenAmount = (investmentAmount - tradingFeeBuy) / buyPrice;
  const saleAmount = tokenAmount * sellPrice;
  
  // Calculate platform fee
  const platformFee = investmentAmount * (platformFeePct / 100);
  
  // Calculate net profit
  const netProfit = saleAmount - investmentAmount - tradingFeeBuy - tradingFeeSell - gasFeeUSD - platformFee;
  
  // Calculate profit percentage
  const profitPercentage = (netProfit / investmentAmount) * 100;
  
  return {
    netProfit,
    profitPercentage,
    tradingFeeBuy,
    tradingFeeSell,
    platformFee
  };
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

    // For Solana, ensure we only use Solana-specific DEXs
    const filteredDexSettings = networkName === 'solana' 
      ? dexSettings.filter(dex => ['jupiter', 'orca', 'raydium'].includes(dex.slug.toLowerCase()))
      : dexSettings.filter(dex => !['jupiter', 'orca', 'raydium'].includes(dex.slug.toLowerCase()));

    console.log(`Using ${filteredDexSettings.length} filtered DEXs for ${networkName}`);

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

    // Try to get real token price as a base reference
    let baseTokenPrice = await fetchTokenPrice(baseToken.symbol, networkName);
    console.log(`Base token price from external API: ${baseTokenPrice}`);
    
    // If we couldn't get a real price, use a default based on common tokens
    if (!baseTokenPrice) {
      baseTokenPrice = baseToken.symbol === 'ETH' ? 3500 : 
                     baseToken.symbol === 'BNB' ? 550 : 
                     baseToken.symbol === 'SOL' ? 150 : 
                     baseToken.symbol === 'USDC' || baseToken.symbol === 'USDT' || baseToken.symbol === 'DAI' ? 1 :
                     10; // Default value for other tokens
    }

    // Generate arbitrage opportunities with more realistic price differences
    const opportunities = [];
    for (let i = 0; i < filteredDexSettings.length; i++) {
      const buyDex = filteredDexSettings[i];
      
      for (let j = 0; j < filteredDexSettings.length; j++) {
        if (i === j) continue; // Skip same DEX comparison
        
        const sellDex = filteredDexSettings[j];
        
        // Create price variations between DEXs
        // In production, we'd use real API calls to DEXes for actual prices
        const priceDiff = (Math.random() * 0.04) - 0.01; // Between -1% and +3%
        const buyPrice = baseTokenPrice * (1 - Math.random() * 0.005); // Small discount on buy side
        const sellPrice = buyPrice * (1 + priceDiff); // Apply difference for sell price
        
        // Calculate profit using our utility function
        const profitData = calculateProfit(
          buyPrice, 
          sellPrice, 
          investmentAmount,
          buyDex.trading_fee_percentage,
          sellDex.trading_fee_percentage,
          calculateGasFeeUSD(networkName, gasFees),
          0.5 // 0.5% platform fee
        );
        
        // Generate liquidity estimates (in production would come from DEX APIs)
        const liquidityBuy = Math.floor(50000 + Math.random() * 950000);
        const liquiditySell = Math.floor(50000 + Math.random() * 950000);
        
        // Calculate price difference percentage for logging
        const priceDifferencePercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        // Only include profitable opportunities meeting the threshold
        if (profitData.profitPercentage >= profitThreshold && 
            calculateGasFeeUSD(networkName, gasFees) <= gasThreshold) {
          
          const opportunityId = generateOpportunityId();
          
          // Add opportunity to array with well-formatted numbers
          opportunities.push({
            id: opportunityId,
            buyDex: buyDex.name,
            sellDex: sellDex.name,
            buyPrice: parseFloat(buyPrice.toFixed(6)),
            sellPrice: parseFloat(sellPrice.toFixed(6)),
            profitPercentage: parseFloat(profitData.profitPercentage.toFixed(2)),
            netProfit: parseFloat(profitData.netProfit.toFixed(2)),
            tradingFeeBuy: parseFloat(profitData.tradingFeeBuy.toFixed(4)),
            tradingFeeSell: parseFloat(profitData.tradingFeeSell.toFixed(4)),
            gasFee: parseFloat(calculateGasFeeUSD(networkName, gasFees).toFixed(4)),
            platformFee: parseFloat(profitData.platformFee.toFixed(4)),
            liquidityBuy,
            liquiditySell,
            network: networkName,
            token: baseToken.symbol,
            priceDiff: parseFloat(priceDifferencePercentage.toFixed(2))
          });
          
          // Store in database for history/analytics
          try {
            const { error: storeError } = await supabase
              .from('arbitrage_opportunities')
              .insert({
                id: opportunityId,
                token_pair: `${baseToken.symbol}/${quoteToken.symbol}`,
                buy_exchange: buyDex.name,
                sell_exchange: sellDex.name,
                estimated_profit: profitData.netProfit.toFixed(2),
                network: networkName,
                status: 'active',
                price_diff: priceDifferencePercentage,
                risk: profitData.profitPercentage > 3 ? 'low' : profitData.profitPercentage > 1 ? 'medium' : 'high'
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
