
import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPriceComparisonData, fetchAndSavePriceData } from '@/services/priceHistoryService';
import { TokenInfo } from '@/services/tokenListService';
import { useToast } from '@/hooks/use-toast';
import debounce from 'lodash.debounce';

interface PriceChartProps {
  baseToken?: TokenInfo | null;
  quoteToken?: TokenInfo;
  selectedDexes?: string[];
  onError?: (message: string) => void;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  baseToken,
  quoteToken,
  selectedDexes = [],
  onError
}) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDex1, setSelectedDex1] = useState<string>(selectedDexes[0] || 'uniswap');
  const [selectedDex2, setSelectedDex2] = useState<string>(selectedDexes[1] || 'sushiswap');
  const { toast } = useToast();
  
  // Define available DEXes based on the selected chain
  const [availableDexes, setAvailableDexes] = useState<string[]>([]);
  
  // Update available DEXes when chain changes
  useEffect(() => {
    if (!baseToken) return;
    
    // Set available DEXes based on chain
    if (baseToken.chainId === 1) {
      setAvailableDexes(['uniswap', 'sushiswap', 'balancer', 'curve']);
      setSelectedDex1('uniswap');
      setSelectedDex2('sushiswap');
    } else if (baseToken.chainId === 56) {
      setAvailableDexes(['pancakeswap']);
      setSelectedDex1('pancakeswap');
      setSelectedDex2('');
    } else if (baseToken.chainId === 101) {
      setAvailableDexes(['jupiter', 'orca', 'raydium']);
      setSelectedDex1('jupiter');
      setSelectedDex2('raydium');
    } else {
      setAvailableDexes([]);
    }
  }, [baseToken]);

  // Format with proper time and price
  const formatData = (priceData: any[]) => {
    // Find all unique timestamps
    const allTimestamps = new Set<string>();
    priceData.forEach(dex => {
      dex.data.forEach((point: any) => {
        allTimestamps.add(point.timestamp);
      });
    });

    // Create data points for each timestamp
    return Array.from(allTimestamps).map(timestamp => {
      const point: any = { timestamp };
      
      priceData.forEach(dex => {
        const dataPoint = dex.data.find((p: any) => p.timestamp === timestamp);
        if (dataPoint) {
          point[dex.dexName] = dataPoint.price;
        }
      });
      
      return point;
    }).sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  };

  const loadPriceData = useCallback(async () => {
    if (!baseToken) return;
    
    setIsLoading(true);
    try {
      // Create default quote token if not provided
      const defaultQuoteToken: TokenInfo = quoteToken || {
        name: 'US Dollar',
        symbol: 'USD',
        address: '0x0',
        chainId: baseToken.chainId,
        decimals: 18
      };
      
      const tokenPair = `${baseToken.symbol}/${defaultQuoteToken.symbol}`;
      const dexes = [selectedDex1, selectedDex2].filter(Boolean);
      
      if (dexes.length === 0) {
        toast({
          title: "No DEXes selected",
          description: "Please select at least one DEX to compare prices.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      // First, update price data by fetching fresh quotes
      await fetchAndSavePriceData(baseToken, defaultQuoteToken, dexes, baseToken.chainId);
      
      // Then fetch comparison data
      const comparisonData = await getPriceComparisonData(tokenPair, dexes);
      
      if (comparisonData.length === 0) {
        toast({
          title: "No price data available",
          description: `No price data found for ${tokenPair} on the selected DEXes.`,
          variant: "destructive"
        });
      } else {
        setData(formatData(comparisonData));
      }
    } catch (error) {
      console.error('Error loading price data:', error);
      if (onError) onError('Failed to load price data');
      toast({
        title: "Error loading price data",
        description: "Could not fetch price data from the selected DEXes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [baseToken, quoteToken, selectedDex1, selectedDex2, toast, onError]);

  // Use debounced version for DEX selection changes
  const debouncedLoadData = useCallback(debounce(loadPriceData, 300), [loadPriceData]);

  useEffect(() => {
    if (baseToken && (selectedDex1 || selectedDex2)) {
      debouncedLoadData();
    }
    
    return () => {
      debouncedLoadData.cancel();
    };
  }, [baseToken, selectedDex1, selectedDex2, debouncedLoadData]);

  const handleRefresh = () => {
    loadPriceData();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price: number) => {
    if (price > 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (price > 1) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }
  };
  
  const colors = {
    uniswap: '#FF007A',
    sushiswap: '#FA7147',
    balancer: '#1E1E1E',
    curve: '#A5A4CE',
    pancakeswap: '#D1884F',
    jupiter: '#F04A23',
    orca: '#7C41F5',
    raydium: '#4FACF7'
  };

  if (!baseToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Select tokens to view price comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Price Comparison: {baseToken?.symbol}/{quoteToken?.symbol || 'USD'}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">{isLoading ? 'Loading...' : 'Refresh'}</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex-1">
            <Select value={selectedDex1} onValueChange={setSelectedDex1}>
              <SelectTrigger>
                <SelectValue placeholder="Select DEX 1" />
              </SelectTrigger>
              <SelectContent>
                {availableDexes.map(dex => (
                  <SelectItem key={`dex1-${dex}`} value={dex}>
                    {dex.charAt(0).toUpperCase() + dex.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select value={selectedDex2} onValueChange={setSelectedDex2}>
              <SelectTrigger>
                <SelectValue placeholder="Select DEX 2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {availableDexes.filter(dex => dex !== selectedDex1).map(dex => (
                  <SelectItem key={`dex2-${dex}`} value={dex}>
                    {dex.charAt(0).toUpperCase() + dex.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex mb-3 space-x-2">
          {selectedDex1 && (
            <Badge style={{ backgroundColor: colors[selectedDex1 as keyof typeof colors] || '#888' }}>
              {selectedDex1.charAt(0).toUpperCase() + selectedDex1.slice(1)}
            </Badge>
          )}
          {selectedDex2 && (
            <Badge style={{ backgroundColor: colors[selectedDex2 as keyof typeof colors] || '#888' }}>
              {selectedDex2.charAt(0).toUpperCase() + selectedDex2.slice(1)}
            </Badge>
          )}
        </div>
        
        <div className="h-80 w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Loading price data...</p>
              </div>
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  label={{ value: 'Time', position: 'insideBottomRight', offset: 0 }}
                />
                <YAxis 
                  tickFormatter={(price) => formatPrice(price)}
                  label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip 
                  formatter={(value: any) => [`${formatPrice(value)} USD`, '']}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                {selectedDex1 && data.some(item => item[selectedDex1] !== undefined) && (
                  <Line
                    type="monotone"
                    dataKey={selectedDex1}
                    stroke={colors[selectedDex1 as keyof typeof colors] || '#888'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {selectedDex2 && data.some(item => item[selectedDex2] !== undefined) && (
                  <Line
                    type="monotone"
                    dataKey={selectedDex2}
                    stroke={colors[selectedDex2 as keyof typeof colors] || '#888'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                No price data available. Try selecting different DEXes or click Refresh.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
