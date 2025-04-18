
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { getDexFee, getGasEstimate } from './utils';

export async function fetchAndStorePriceData(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): Promise<Record<string, PriceQuote>> {
  try {
    const { data, error } = await supabase.functions.invoke('update-price-data', {
      body: { 
        tokenPairs: [{ baseToken, quoteToken }],
        chainId: baseToken.chainId
      }
    });

    if (error) {
      console.error('Error fetching price data:', error);
      throw new Error(`Failed to fetch price data: ${error.message}`);
    }

    const { data: prices } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', `${baseToken.symbol}/${quoteToken.symbol}`)
      .eq('chain_id', baseToken.chainId)
      .order('timestamp', { ascending: false });

    // Convert database records to PriceQuote format
    const priceQuotes: Record<string, PriceQuote> = {};
    
    if (prices && prices.length > 0) {
      const dexPrices = new Map<string, any>();
      prices.forEach(price => {
        if (!dexPrices.has(price.dex_name)) {
          dexPrices.set(price.dex_name, price);
        }
      });

      dexPrices.forEach((price, dexName) => {
        priceQuotes[dexName] = {
          dexName: dexName,
          price: price.price,
          fees: getDexFee(dexName),
          gasEstimate: getGasEstimate(baseToken.chainId, dexName),
          liquidityUSD: price.liquidity || 100000,
          timestamp: price.timestamp
        };
      });
    }

    return priceQuotes;
  } catch (error) {
    console.error('Error in fetchAndStorePriceData:', error);
    return {};
  }
}
