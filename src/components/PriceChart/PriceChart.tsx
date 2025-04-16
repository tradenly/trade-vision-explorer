
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPriceComparisonData, fetchAndSavePriceData } from '@/services/priceHistoryService';
import { TokenInfo } from '@/services/tokenListService';

interface PriceChartProps {
  baseToken?: TokenInfo;
  quoteToken?: TokenInfo;
  selectedDexes?: string[];
}

export const PriceChart: React.FC<PriceChartProps> = ({
  baseToken,
  quoteToken,
  selectedDexes = [],
}) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDex1, setSelectedDex1] = useState<string>(selectedDexes[0] || 'uniswap');
  const [selectedDex2, setSelectedDex2] = useState<string>(selectedDexes[1] || 'sushiswap');
  const [availableDexes, setAvailableDexes] = useState<string[]>([
    'uniswap',
    'sushiswap',
    'balancer',
    'curve',
    'pancakeswap',
    'jupiter',
    'orca',
    'raydium'
  ]);

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

  const loadPriceData = async () => {
    if (!baseToken || !quoteToken) return;
    
    setIsLoading(true);
    try {
      const tokenPair = `${baseToken.symbol}/${quoteToken.symbol}`;
      const dexes = [selectedDex1, selectedDex2];
      
      // Fix: Add a placeholder third parameter for chainId, since it's required
      await fetchAndSavePriceData(baseToken, quoteToken, dexes, baseToken.chainId);
      
      // Fetch comparison data
      const comparisonData = await getPriceComparisonData(tokenPair, dexes);
      setData(formatData(comparisonData));
    } catch (error) {
      console.error('Error loading price data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (baseToken && quoteToken) {
      loadPriceData();
    }
  }, [baseToken, quoteToken, selectedDex1, selectedDex2]);

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

  if (!baseToken || !quoteToken) {
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
          Price Comparison: {baseToken?.symbol}/{quoteToken?.symbol}
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="ml-2">{isLoading ? 'Loading...' : 'Refresh'}</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between mb-4 space-x-2">
          <div className="flex-1">
            <Select value={selectedDex1} onValueChange={setSelectedDex1}>
              <SelectTrigger>
                <SelectValue placeholder="Select DEX 1" />
              </SelectTrigger>
              <SelectContent>
                {availableDexes.filter(dex => dex !== selectedDex2).map(dex => (
                  <SelectItem key={dex} value={dex}>
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
                {availableDexes.filter(dex => dex !== selectedDex1).map(dex => (
                  <SelectItem key={dex} value={dex}>
                    {dex.charAt(0).toUpperCase() + dex.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex mb-3 space-x-2">
          <Badge style={{ backgroundColor: colors[selectedDex1 as keyof typeof colors] || '#888' }}>
            {selectedDex1.charAt(0).toUpperCase() + selectedDex1.slice(1)}
          </Badge>
          <Badge style={{ backgroundColor: colors[selectedDex2 as keyof typeof colors] || '#888' }}>
            {selectedDex2.charAt(0).toUpperCase() + selectedDex2.slice(1)}
          </Badge>
        </div>
        
        <div className="h-80 w-full">
          {data.length > 0 ? (
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
                {selectedDex1 && (
                  <Line
                    type="monotone"
                    dataKey={selectedDex1}
                    stroke={colors[selectedDex1 as keyof typeof colors] || '#888'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {selectedDex2 && (
                  <Line
                    type="monotone"
                    dataKey={selectedDex2}
                    stroke={colors[selectedDex2 as keyof typeof colors] || '#888'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    animationDuration={500}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                {isLoading ? "Loading price data..." : "No price data available"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
