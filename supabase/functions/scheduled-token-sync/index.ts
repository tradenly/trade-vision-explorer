
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Sync Ethereum tokens
    await supabase.functions.invoke('sync-tokens', {
      body: { chainId: 1 }
    })

    // Wait to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Sync BSC tokens
    await supabase.functions.invoke('sync-tokens', {
      body: { chainId: 56 }
    })

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Token sync completed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
