
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalCheckRequest {
  tokenAddress: string;
  spenderAddress: string;
  walletAddress: string;
  chainId: number;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokenAllowance(request: ApprovalCheckRequest): Promise<boolean> {
  const { tokenAddress, spenderAddress, walletAddress, chainId } = request;
  
  try {
    // For Solana, we don't need to check allowance as it uses a different model
    if (chainId === 101) {
      // Solana always returns true as it uses a different authorization model
      return true;
    }
    
    // For EVM chains
    // In a real implementation, we would make an RPC call to check the allowance
    // For this demo, we'll check if there's an approval record in our database
    const { data } = await supabase
      .from('token_approvals')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('token_address', tokenAddress)
      .eq('spender_address', spenderAddress)
      .eq('status', 'completed')
      .maybeSingle();
    
    return !!data;
  } catch (error) {
    console.error('Error checking token allowance:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const request: ApprovalCheckRequest = await req.json();
    const isApproved = await checkTokenAllowance(request);
    
    return new Response(JSON.stringify({ isApproved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ 
      isApproved: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
