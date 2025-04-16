
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from './tokenListService';
import { PriceQuote, getQuotesForChain } from './dexService';

export interface PriceHistoryDataPoint {
  timestamp: string;
  price: number;
  dexName: string;
}

export interface DexPriceComparison {
  dexName: string;
  data: {
    timestamp: string;
    price: number;
  }[];
}

// Save price data to Supabase
export async function savePriceData(
  tokenPair: string, 
  dexName: string, 
  chainId: number,
  price: number
): Promise<void> {
  try {
    await supabase.from('dex_price_history').insert({
      token_pair: tokenPair,
      dex_name: dexName,
      chain_id: chainId,
      price: price
    });
  } catch (error) {
    console.error('Error saving price data:', error);
  }
}

// Get latest price data for a token pair
export async function getLatestPriceData(
  tokenPair: string,
  limit: number = 50
): Promise<PriceHistoryDataPoint[]> {
  try {
    const { data, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', tokenPair)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data.map(item => ({
      timestamp: new Date(item.timestamp).toISOString(),
      price: Number(item.price),
      dexName: item.dex_name
    }));
  } catch (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
}

// Get price data grouped by DEX for charting
export async function getPriceComparisonData(
  tokenPair: string,
  dexNames: string[]
): Promise<DexPriceComparison[]> {
  try {
    const { data, error } = await supabase
      .from('dex_price_history')
      .select('*')
      .eq('token_pair', tokenPair)
      .in('dex_name', dexNames)
      .order('timestamp', { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    // Group by DEX name for easier charting
    const groupedByDex: Record<string, any[]> = {};
    
    data.forEach(item => {
      if (!groupedByDex[item.dex_name]) {
        groupedByDex[item.dex_name] = [];
      }
      
      groupedByDex[item.dex_name].push({
        timestamp: new Date(item.timestamp).toISOString(),
        price: Number(item.price)
      });
    });

    return Object.entries(groupedByDex).map(([dexName, dataPoints]) => ({
      dexName,
      data: dataPoints.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    }));
  } catch (error) {
    console.error('Error fetching price comparison data:', error);
    return [];
  }
}

// Fetch current quotes and save them to the database
export async function fetchAndSavePriceData(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): Promise<void> {
  try {
    const quotes = await getQuotesForChain(baseToken, quoteToken, baseToken.chainId);
    const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
    
    // Save each quote to the database
    await Promise.all(quotes.map(quote => 
      savePriceData(tokenPair, quote.dexName, baseToken.chainId, quote.price)
    ));
  } catch (error) {
    console.error('Error fetching and saving price data:', error);
  }
}
