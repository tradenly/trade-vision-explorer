
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PriceData, TokenPair } from "./types.ts";

export async function processEvmTokenPairs(
  batch: TokenPair[], 
  dex: any, 
  chainId: number,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const prices: PriceData[] = [];
  
  for (const pair of batch) {
    try {
      const amountIn = "1000000000000000000"; // 1 token in wei
      const url = `https://api.1inch.io/v5.0/${chainId}/quote?` +
        `fromTokenAddress=${pair.baseToken.address}&` +
        `toTokenAddress=${pair.quoteToken.address}&` +
        `amount=${amountIn}&` +
        `protocols=${dex.name.toLowerCase()}`;

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) continue;

      const data = await response.json();
      
      const fromDecimals = pair.baseToken.decimals || 18;
      const toDecimals = pair.quoteToken.decimals || 18;
      const fromAmount = parseInt(data.fromTokenAmount) / Math.pow(10, fromDecimals);
      const toAmount = parseInt(data.toTokenAmount) / Math.pow(10, toDecimals);
      const price = toAmount / fromAmount;

      prices.push({
        token_pair: `${pair.baseToken.symbol}/${pair.quoteToken.symbol}`,
        price,
        chain_id: chainId,
        dex_name: dex.name.toLowerCase(),
        timestamp: new Date().toISOString(),
        liquidity: data.protocols?.[0]?.[0]?.liquidityInUsd || 100000
      });
    } catch (error) {
      console.error(`Error processing EVM pair ${pair.baseToken.symbol}/${pair.quoteToken.symbol}:`, error);
    }
  }
  
  if (prices.length > 0) {
    const { error } = await supabase.from('dex_price_history').insert(prices);
    if (error) throw error;
  }
}
