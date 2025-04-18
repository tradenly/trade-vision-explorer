
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TokenSelector from '@/components/TokenSelector/TokenSelector';
import PriceMonitor from '@/components/ArbitrageScanner/PriceMonitor';
import { TokenInfo } from '@/services/tokenListService';

const PriceMonitoringSection: React.FC = () => {
  const [selectedBaseToken, setSelectedBaseToken] = useState<TokenInfo | null>(null);
  const [selectedQuoteToken, setSelectedQuoteToken] = useState<TokenInfo | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Price Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Base Token</label>
              <TokenSelector
                selectedToken={selectedBaseToken}
                onSelectToken={setSelectedBaseToken}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quote Token</label>
              <TokenSelector
                selectedToken={selectedQuoteToken}
                onSelectToken={setSelectedQuoteToken}
              />
            </div>
          </div>
          <Button 
            onClick={() => setMonitoringActive(!monitoringActive)}
            variant={monitoringActive ? "destructive" : "default"}
          >
            {monitoringActive ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
        </CardContent>
      </Card>

      {(selectedBaseToken && selectedQuoteToken) && (
        <div className="mb-6">
          <PriceMonitor
            baseToken={selectedBaseToken}
            quoteToken={selectedQuoteToken}
            isActive={monitoringActive}
          />
        </div>
      )}
    </>
  );
};

export default PriceMonitoringSection;
