
import { supabase } from '@/lib/supabaseClient';

// Fetch arbitrage opportunities
export async function fetchArbitrageOpportunities() {
  const { data, error } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error fetching arbitrage opportunities:', error);
    throw error;
  }

  return data;
}

// Fetch price data
export async function fetchPriceData() {
  const { data, error } = await supabase
    .from('price_data')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching price data:', error);
    throw error;
  }

  return data;
}
