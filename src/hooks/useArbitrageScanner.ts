
import { useState, useEffect, useCallback } from 'react';
import { TokenInfo } from '@/services/tokenListService';
import { ArbitrageOpportunity } from '@/services/dexService';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { scanArbitrageOpportunities } from '@/services/arbitrageScanner';
import { LiquidityValidationService } from '@/services/dex/services/LiquidityValidationService';
import { RouteOptimizationService } from '@/services/dex/services/RouteOptimizationService';
import { FeeService } from '@/services/dex/services/FeeService';

export interface ScanOptions {
  minProfitPercentage: number;
  maxSlippageTolerance: number;
  minLiquidity: number;
}

export function useArbitrageScanner(
  baseToken: TokenInfo | null,
  quoteToken: TokenInfo | null,
  investmentAmount: number = 1000,
  scanOptions: ScanOptions = { minProfitPercentage: 0.5, maxSlippageTolerance: 2, minLiquidity: 10000 },
  autoScan: boolean = false
) {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const { toast } = useToast();
  
  // Services
  const liquidityService = LiquidityValidationService.getInstance();
  const routeOptimizer = RouteOptimizationService.getInstance();
  const feeService = FeeService.getInstance();

  const resetErrors = useCallback(() => {
    setConsecutiveErrors(0);
    setError(null);
  }, []);

  const scanUsingEdgeFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scan-arbitrage', {
        body: {
          baseToken,
          quoteToken,
          minProfitPercentage: scanOptions.minProfitPercentage,
          maxSlippageTolerance: scanOptions.maxSlippageTolerance,
          minLiquidity: scanOptions.minLiquidity,
          investmentAmount
        }
      });

      if (error) throw new Error(error.message);
      
      return {
        opportunities: data.opportunities || [],
        errors: data.error ? [data.error] : []
      };
    } catch (error) {
      console.error("Error calling edge function:", error);
      throw error;
    }
  };

  const scanForOpportunities = useCallback(async () => {
    if (!baseToken || !quoteToken) {
      setError('Please select both base and quote tokens');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const priceData = await scanUsingEdgeFunction();
      
      if (!priceData.opportunities || priceData.opportunities.length === 0) {
        setOpportunities([]);
        return;
      }

      const optimizedOpportunities = [];

      for (const opp of priceData.opportunities) {
        try {
          // Validate liquidity
          const liquidityValidation = await liquidityService.validateArbitrageRoute(
            baseToken,
            quoteToken,
            opp.buyDex,
            opp.sellDex,
            investmentAmount
          );
          
          if (!liquidityValidation.isValid) {
            console.log(`Skipping opportunity due to insufficient liquidity: ${opp.buyDex} -> ${opp.sellDex}`);
            continue;
          }
          
          // Calculate fees more precisely
          const fees = await feeService.calculateAllFees(
            investmentAmount,
            opp.buyDex,
            opp.sellDex,
            opp.network
          );
          
          const quotes = {
            [opp.buyDex]: { 
              price: opp.buyPrice, 
              fees: fees.tradingFee / 2 / investmentAmount, 
              gasEstimate: fees.gasFee / 2,
              liquidityUSD: liquidityValidation.buyLiquidity.availableLiquidity
            },
            [opp.sellDex]: { 
              price: opp.sellPrice, 
              fees: fees.tradingFee / 2 / investmentAmount, 
              gasEstimate: fees.gasFee / 2,
              liquidityUSD: liquidityValidation.sellLiquidity.availableLiquidity
            }
          };

          const optimizedRoute = await routeOptimizer.findOptimalRoute(
            baseToken,
            quoteToken,
            investmentAmount,
            quotes
          );

          if (optimizedRoute.isViable) {
            optimizedOpportunities.push({
              ...opp,
              route: optimizedRoute.steps,
              netProfit: optimizedRoute.expectedProfit,
              gasFee: fees.gasFee,
              tradingFees: fees.tradingFee,
              platformFee: fees.platformFee,
              liquidity: Math.min(
                liquidityValidation.buyLiquidity.availableLiquidity,
                liquidityValidation.sellLiquidity.availableLiquidity
              )
            });
          }
        } catch (oppError) {
          console.error('Error processing opportunity:', oppError);
          // Continue with next opportunity
        }
      }

      const filteredOpportunities = optimizedOpportunities
        .filter(opp => 
          opp.netProfit >= (investmentAmount * scanOptions.minProfitPercentage / 100) && 
          opp.liquidity >= scanOptions.minLiquidity
        )
        .sort((a, b) => b.netProfit - a.netProfit);

      setOpportunities(filteredOpportunities);
      setLastScanTime(new Date());
      resetErrors();

      if (filteredOpportunities.length > 0) {
        toast({
          title: "Arbitrage Opportunities Found",
          description: `Found ${filteredOpportunities.length} viable trades.`,
        });
      }
    } catch (err) {
      console.error('Error scanning for arbitrage:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for arbitrage opportunities');
      setOpportunities([]);
      setConsecutiveErrors(prev => prev + 1);
      
      toast({
        title: "Scan Failed",
        description: err instanceof Error ? err.message : 'Failed to scan for opportunities',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [baseToken, quoteToken, scanOptions, investmentAmount, liquidityService, routeOptimizer, feeService, toast, resetErrors]);

  useEffect(() => {
    if (!autoScan || !baseToken || !quoteToken) return;

    let intervalId: NodeJS.Timeout;
    
    const startScanning = () => {
      const baseDelay = 30000; // 30 seconds base interval
      const errorBackoff = consecutiveErrors > 0 
        ? Math.min(Math.pow(2, consecutiveErrors) * 1000, 300000) // Max 5 minutes
        : 0;
      
      const delay = baseDelay + errorBackoff;

      intervalId = setInterval(scanForOpportunities, delay);
      
      scanForOpportunities();
    };

    startScanning();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoScan, baseToken, quoteToken, consecutiveErrors, scanForOpportunities]);

  return {
    opportunities,
    loading,
    error,
    scanForOpportunities,
    lastScanTime,
    consecutiveErrors
  };
}
