
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TokenInfo } from '@/services/tokenListService';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface PriceChartProps {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  timeframe?: '1D' | '1W' | '1M';
  height?: number;
}

interface PriceData {
  timestamp: number;
  price: number;
  time: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ 
  baseToken, 
  quoteToken,
  timeframe = '1D',
  height = 350 
}) => {
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateMockPriceData = () => {
      if (!baseToken?.symbol || !quoteToken?.symbol) {
        setError('Invalid token pair');
        return [];
      }

      const now = new Date();
      let startTime: Date;
      let pointCount = 24;
      let timeFormat = 'HH:mm';

      // Calculate start time based on timeframe
      switch (timeframe) {
        case '1W':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          pointCount = 7;
          timeFormat = 'MM/dd';
          break;
        case '1M':
          startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          pointCount = 30;
          timeFormat = 'MM/dd';
          break;
        default: // 1D
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          pointCount = 24;
          timeFormat = 'HH:mm';
      }

      // Generate prices with a realistic pattern
      let lastPrice = 1000 + Math.random() * 500; // Starting price $1000-1500
      const volatility = 0.02; // 2% price movement
      
      const mockData: PriceData[] = [];
      
      for (let i = 0; i <= pointCount; i++) {
        const pointTime = new Date(startTime.getTime() + (i * (now.getTime() - startTime.getTime()) / pointCount));
        
        // Generate price movement
        const changePercent = (Math.random() - 0.5) * volatility;
        lastPrice = lastPrice * (1 + changePercent);
        
        mockData.push({
          timestamp: pointTime.getTime(),
          price: parseFloat(lastPrice.toFixed(2)),
          time: pointTime.toLocaleTimeString()
        });
      }
      
      return mockData;
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Reset when tokens change
        if (!baseToken || !quoteToken) {
          setChartData([]);
          setLoading(false);
          return;
        }

        // In a real app, you would fetch actual price data here
        // For now, we'll use mock data
        const mockData = generateMockPriceData();
        setChartData(mockData);
      } catch (err) {
        console.error('Error fetching price data:', err);
        setError('Failed to load price data');
        
        toast({
          title: "Error",
          description: "Failed to load price chart data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [baseToken, quoteToken, timeframe]);

  const formatYAxis = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatTooltip = (value: number) => {
    return [`$${value.toFixed(2)}`, `${baseToken?.symbol}/${quoteToken?.symbol}`];
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {baseToken && quoteToken ? (
            <>
              <span>{baseToken.symbol}/{quoteToken.symbol} Price Chart</span>
              <span className="text-sm text-muted-foreground">{timeframe}</span>
            </>
          ) : (
            'Price Chart'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="w-full h-80">
            <Skeleton className="w-full h-full" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-80 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp);
                  return timeframe === '1D' 
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={formatYAxis} 
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="price"
                name={`${baseToken?.symbol}/${quoteToken?.symbol}`}
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-80 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No price data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceChart;
