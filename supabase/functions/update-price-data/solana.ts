
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PriceData, TokenPair } from "./types.ts";

export async function processSolanaTokenPairs(
  batch: TokenPair[], 
  dex: any, 
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const prices: PriceData[] = [];
  
  for (const pair of batch) {
    const baseAddress = pair.baseToken.address;
    const quoteAddress = pair.quoteToken.address;
    
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${baseAddress},${quoteAddress}`);
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.data?.[baseAddress]?.price || !data.data?.[quoteAddress]?.price) {
        continue;
      }
      
      const basePrice = data.data[baseAddress].price;
      const quotePrice = data.data[quoteAddress].price;
      const price = basePrice / quotePrice;
      
      prices.push({
        token_pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
        price,
        chain_id: 101,
        dex_name: dex.name.toLowerCase(),
        timestamp: new Date().toISOString(),
        liquidity: data.data[baseAddress].vsMarketCap || 100000
      });
    } catch (error) {
      console.error(`Error processing Solana pair ${pair.baseToken.symbol}/${pair.quoteToken.symbol}:`, error);
    }
  }
  
  if (prices.length > 0) {
    const { error } = await supabase.from('dex_price_history').insert(prices);
    if (error) throw error;
  }
}
