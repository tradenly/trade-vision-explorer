
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TokenInfo } from '@/services/tokenListService';

interface ScanControlsProps {
  baseToken: TokenInfo | null;
  quoteToken: TokenInfo | null;
  onScan: () => void;
  loading: boolean;
  scanError: string | null;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  baseToken,
  quoteToken,
  onScan,
  loading,
  scanError
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button 
          onClick={onScan} 
          disabled={!baseToken || !quoteToken || loading}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan for Opportunities
            </>
          )}
        </Button>
      </div>
      
      {scanError && (
        <Alert variant="destructive">
          <AlertDescription>{scanError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ScanControls;
