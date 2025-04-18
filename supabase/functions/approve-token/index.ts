
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: any;
}

interface ApprovalRequest {
  tokenAddress: string;
  spenderAddress: string;
  walletAddress: string;
  chainId: number;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function simulateTokenApproval(request: ApprovalRequest): Promise<ApprovalResult> {
  const { tokenAddress, spenderAddress, walletAddress, chainId } = request;
  
  try {
    // For now, we'll simulate the token approval since this is a demo
    // In a real implementation, we'd interact with blockchain
    
    // Generate a simulated transaction hash
    const generateTxHash = () => {
      const baseHash = Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('');
      return `0x${baseHash}`;
    };
    
    // Simulate a delay to mimic blockchain interaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const txHash = generateTxHash();
    
    // Log the token approval
    await supabase.from('token_approvals').insert({
      wallet_address: walletAddress,
      token_address: tokenAddress,
      spender_address: spenderAddress,
      amount: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Unlimited
      tx_hash: txHash,
      status: 'completed'
    });
    
    return {
      success: true,
      txHash,
      details: {
        token: tokenAddress,
        spender: spenderAddress,
        explorerUrl: getExplorerUrl(chainId, txHash)
      }
    };
  } catch (error) {
    console.error('Error approving token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error approving token'
    };
  }
}

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    137: 'https://polygonscan.com/tx/',
    42161: 'https://arbiscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    8453: 'https://basescan.org/tx/',
    101: 'https://solscan.io/tx/'
  };
  
  const baseUrl = explorers[chainId] || 'https://etherscan.io/tx/';
  return `${baseUrl}${txHash}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const request: ApprovalRequest = await req.json();
    const result = await simulateTokenApproval(request);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
