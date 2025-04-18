
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@5.7.2";
import { corsHeaders } from "../cors.ts";

const ALCHEMY_API_KEY = Deno.env.get("ALCHEMY_API_KEY") || "";
const INFURA_API_KEY = Deno.env.get("INFURA_API_KEY") || "";

// ERC20 token allowance method ABI
const ERC20_ALLOWANCE_ABI = [
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];

// Chain ID to RPC URL mapping
const getRpcUrl = (chainId: number): string => {
  const chainIdMap = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, // Ethereum
    137: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, // Polygon
    56: `https://bsc-dataseed.binance.org`, // BSC
    42161: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, // Arbitrum
    10: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, // Optimism
    8453: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, // Base
    // Add more chains as needed
    43114: `https://api.avax.network/ext/bc/C/rpc`, // Avalanche
    250: `https://rpc.ftm.tools`, // Fantom
  };

  // Fallback to Infura for Ethereum if Alchemy key is not available
  if (!ALCHEMY_API_KEY && chainId === 1) {
    return `https://mainnet.infura.io/v3/${INFURA_API_KEY}`;
  }

  return chainIdMap[chainId] || "";
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenAddress, spenderAddress, walletAddress, chainId } = await req.json();

    if (!tokenAddress || !spenderAddress || !walletAddress || !chainId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the RPC URL for the specified chain
    const rpcUrl = getRpcUrl(chainId);
    if (!rpcUrl) {
      return new Response(
        JSON.stringify({ error: `Unsupported chain ID: ${chainId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For Solana, we handle differently
    if (chainId === 101) {
      // Solana doesn't use the same approval model as EVM chains
      // For now, just return true since approvals work differently
      return new Response(
        JSON.stringify({ isApproved: true, message: "Solana tokens don't require approval" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Create contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ALLOWANCE_ABI,
      provider
    );

    // Check allowance
    const allowance = await tokenContract.allowance(walletAddress, spenderAddress);
    
    // Convert to readable format
    const allowanceValue = ethers.utils.formatUnits(allowance, 18);
    const isApproved = parseFloat(allowanceValue) > 0;

    console.log(`Checked allowance for token ${tokenAddress} on chain ${chainId}`);
    console.log(`Wallet ${walletAddress} -> Spender ${spenderAddress}`);
    console.log(`Allowance: ${allowanceValue}`);
    
    return new Response(
      JSON.stringify({
        isApproved,
        allowance: allowanceValue,
        tokenAddress,
        spenderAddress,
        walletAddress
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error checking token approval:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Failed to check token approval" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

