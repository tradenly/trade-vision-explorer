
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { getPriceComparisonData, DexPriceComparison, fetchAndSavePriceData } from '@/services/priceHistoryService';
import { TokenInfo } from '@/services/tokenListService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface ChartData {
  timestamp: string;
  [dex: string]: string | number;
}

interface PriceChartProps {
  baseToken: TokenInfo | null;
  quoteToken?: TokenInfo;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

const PriceChart: React.FC<PriceChartProps> = ({ baseToken, quoteToken }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [availableDexes, setAvailableDexes] = useState<string[]>([]);
  const [selectedDexes, setSelectedDexes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Default quote token for different chains
  const defaultQuoteToken = (chainId: number): TokenInfo => ({
    name: chainId === 101 ? 'USDC' : 'USDT',
    symbol: chainId === 101 ? 'USDC' : 'USDT',
    address: '0x00',
    chainId: chainId,
    decimals: 6
  });

  const effectiveQuoteToken = quoteToken || 
    (baseToken ? defaultQuoteToken(baseToken.chainId) : defaultQuoteToken(1));

  // Load price data for the selected token
  useEffect(() => {
    if (!baseToken) return;
    
    const loadPriceData = async () => {
      setLoading(true);
      const tokenPair = `${baseToken.symbol}/${effectiveQuoteToken.symbol}`;
      
      try {
        await fetchAndSavePriceData(baseToken, effectiveQuoteToken);
        const priceData = await getPriceComparisonData(tokenPair, []);
        
        // Extract available DEXes
        const dexes = priceData.map(d => d.dexName);
        setAvailableDexes(dexes);
        
        // Select first two DEXes by default if available
        if (dexes.length > 0 && selectedDexes.length === 0) {
          setSelectedDexes(dexes.slice(0, Math.min(2, dexes.length)));
        }
        
        // Format data for the chart
        if (dexes.length > 0) {
          formatChartData(priceData);
        }
      } catch (error) {
        console.error('Error loading price data:', error);
        toast({
          title: "Failed to load price data",
          description: "Could not fetch price comparison data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadPriceData();
  }, [baseToken, effectiveQuoteToken.symbol]);

  // Update chart when selected DEXes change
  useEffect(() => {
    if (!baseToken || selectedDexes.length === 0) return;
    
    const updateChart = async () => {
      setLoading(true);
      const tokenPair = `${baseToken.symbol}/${effectiveQuoteToken.symbol}`;
      
      try {
        const priceData = await getPriceComparisonData(tokenPair, selectedDexes);
        formatChartData(priceData);
      } catch (error) {
        console.error('Error updating chart:', error);
      } finally {
        setLoading(false);
      }
    };
    
    updateChart();
  }, [selectedDexes, baseToken, effectiveQuoteToken.symbol]);

  // Format data for the chart
  const formatChartData = (priceData: DexPriceComparison[]) => {
    // Create a map of timestamps to consolidate data points
    const timestampMap: Map<string, ChartData> = new Map();
    
    priceData.forEach(dex => {
      dex.data.forEach(point => {
        const timeKey = point.timestamp;
        
        if (!timestampMap.has(timeKey)) {
          timestampMap.set(timeKey, { timestamp: timeKey });
        }
        
        const entry = timestampMap.get(timeKey)!;
        entry[dex.dexName] = point.price;
      });
    });
    
    // Convert map to array and sort by timestamp
    const formattedData = Array.from(timestampMap.values())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    setChartData(formattedData);
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    if (!baseToken) {
      toast({
        title: "No token selected",
        description: "Please select a token first",
        variant: "destructive"
      });
      return;
    }
    
    setRefreshing(true);
    
    try {
      await fetchAndSavePriceData(baseToken, effectiveQuoteToken);
      const tokenPair = `${baseToken.symbol}/${effectiveQuoteToken.symbol}`;
      const priceData = await getPriceComparisonData(tokenPair, selectedDexes);
      formatChartData(priceData);
      
      toast({
        title: "Price data refreshed",
        description: "Chart has been updated with latest prices",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh failed",
        description: "Could not update price data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle selection of a DEX
  const toggleDex = (dexName: string) => {
    if (selectedDexes.includes(dexName)) {
      setSelectedDexes(selectedDexes.filter(d => d !== dexName));
    } else {
      setSelectedDexes([...selectedDexes, dexName]);
    }
  };

  // Format the date for display
  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'MM/dd HH:mm');
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price Comparison Chart</CardTitle>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || !baseToken}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Prices
            </>
          )}
        </Button>
      </CardHeader>
      
      <CardContent>
        {!baseToken ? (
          <div className="text-center p-8 text-muted-foreground">
            Select a token above to view price comparisons across DEXs
          </div>
        ) : loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* DEX Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Select DEXs to Compare:</h3>
              <div className="flex flex-wrap gap-2">
                {availableDexes.map((dex, index) => (
                  <Button
                    key={dex}
                    variant={selectedDexes.includes(dex) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDex(dex)}
                    style={{
                      borderColor: selectedDexes.includes(dex) ? 
                        COLORS[index % COLORS.length] : undefined,
                      background: selectedDexes.includes(dex) ? 
                        COLORS[index % COLORS.length] : undefined,
                    }}
                  >
                    {dex}
                  </Button>
                ))}
              </div>
            </div>
            
            {selectedDexes.length === 0 ? (
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                Please select at least one DEX to view price data
              </div>
            ) : chartData.length === 0 ? (
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                No price data available for the selected DEXs. Try refreshing.
              </div>
            ) : (
              <ChartContainer 
                className="h-80" 
                config={{
                  ...Object.fromEntries(
                    selectedDexes.map((dex, i) => [
                      dex, 
                      { color: COLORS[i % COLORS.length] }
                    ])
                  )
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis />
                    <ChartTooltipContent />
                    <Legend />
                    {selectedDexes.map((dex, index) => (
                      <Line
                        key={dex}
                        type="monotone"
                        dataKey={dex}
                        name={dex}
                        stroke={COLORS[index % COLORS.length]}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
            
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-md text-sm">
              <p>Showing price comparison for <span className="font-semibold">{baseToken.symbol}/{effectiveQuoteToken.symbol}</span></p>
              {selectedDexes.length > 0 && (
                <div className="mt-2">
                  <p>Price Difference:</p>
                  {chartData.length > 0 && selectedDexes.length >= 2 && (
                    <div className="mt-1">
                      {(() => {
                        const latestPoint = chartData[chartData.length - 1];
                        const dex1 = selectedDexes[0];
                        const dex2 = selectedDexes[1];
                        const price1 = latestPoint[dex1] as number;
                        const price2 = latestPoint[dex2] as number;
                        
                        if (price1 && price2) {
                          const diff = Math.abs(price1 - price2);
                          const pctDiff = (diff / Math.min(price1, price2)) * 100;
                          const diffStr = pctDiff.toFixed(2);
                          
                          return (
                            <p>
                              Latest: <span className="font-medium">{diffStr}%</span> difference between {dex1} and {dex2}
                              {pctDiff > 1 && (
                                <span className="ml-1 text-green-600 dark:text-green-400">
                                  (potential arbitrage opportunity)
                                </span>
                              )}
                            </p>
                          );
                        }
                        return <p>Price data not available for comparison</p>;
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceChart;
