
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';

interface ScanControlsProps {
  loading: boolean;
  onScan: () => void;
  lastScanTime: Date | null;
  disabled: boolean;
}

export const ScanControls: React.FC<ScanControlsProps> = ({
  loading,
  onScan,
  lastScanTime,
  disabled
}) => {
  return (
    <div className="flex justify-between items-center">
      <Button 
        onClick={onScan} 
        disabled={disabled || loading}
        className="flex items-center"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Scan for Opportunities
          </>
        )}
      </Button>
      
      <div className="text-sm text-muted-foreground">
        {lastScanTime ? `Last scan: ${lastScanTime.toLocaleTimeString()}` : 'No scans yet'}
      </div>
    </div>
  );
};
