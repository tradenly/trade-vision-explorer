
import { supabase } from '@/lib/supabaseClient';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { GasEstimationService } from './dex/services/GasEstimationService';
import { fetchAndStorePriceData } from './arbitrage/PriceDataService';
import { getNetworkName } from './arbitrage/utils';
import { storeArbitrageOpportunities } from './arbitrage/OpportunityStorageService';
import { ArbitrageOpportunityService } from './arbitrage/ArbitrageOpportunityService';

interface ScanResult {
  opportunities: ArbitrageOpportunity[];
  errors: string[];
}

export async function scanArbitrageOpportunities(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  minProfitPercentage: number = 0.5,
  investmentAmount: number = 1000
): Promise<ScanResult> {
  const errors: string[] = [];
  const opportunities: ArbitrageOpportunity[] = [];

  try {
    console.log(`Scanning for arbitrage: ${baseToken.symbol}/${quoteToken.symbol}`);

    // Try direct edge function call first
    try {
      const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
        body: { 
          baseToken, 
          quoteToken, 
          minProfitPercentage,
          investmentAmount 
        }
      });

      if (error) throw error;

      if (data.opportunities && data.opportunities.length > 0) {
        console.log(`Found ${data.opportunities.length} opportunities via edge function`);
        return { opportunities: data.opportunities, errors: [] };
      }
      
      console.log('No opportunities found via edge function, falling back to client-side processing');
    } catch (edgeFnError) {
      console.warn('Edge function call failed, falling back to client-side processing:', edgeFnError);
    }

    const priceQuotes = await fetchAndStorePriceData(baseToken, quoteToken);
    
    if (Object.keys(priceQuotes).length < 2) {
      return {
        opportunities: [],
        errors: ['Not enough price quotes available for arbitrage']
      };
    }

    console.log(`Got ${Object.keys(priceQuotes).length} price quotes for comparison`);

    const networkName = getNetworkName(baseToken.chainId);
    const gasEstimationService = GasEstimationService.getInstance();
    const gasEstimate = await gasEstimationService.getOperationGasEstimate(networkName, 'swap');
    const approvalGasEstimate = await gasEstimationService.getOperationGasEstimate(networkName, 'approval');

    const arbitrageService = ArbitrageOpportunityService.getInstance();
    const foundOpportunities = arbitrageService.findOpportunities(
      priceQuotes,
      baseToken,
      quoteToken,
      minProfitPercentage,
      investmentAmount,
      networkName,
      gasEstimate,
      approvalGasEstimate
    );

    if (foundOpportunities.length > 0) {
      await storeArbitrageOpportunities(foundOpportunities);
    }

    return { opportunities: foundOpportunities, errors };
  } catch (error) {
    console.error('Error in scanArbitrageOpportunities:', error);
    return {
      opportunities: [],
      errors: ['Failed to scan for arbitrage opportunities']
    };
  }
}
