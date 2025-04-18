
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DialogFooterProps {
  isConnected: boolean;
  walletAddress: string | null;
  executing: boolean;
  onExecute: () => void;
  onClose: () => void;
}

const DialogFooter: React.FC<DialogFooterProps> = ({
  isConnected,
  walletAddress,
  executing,
  onExecute,
  onClose
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
      <div className="text-sm">
        {!isConnected ? (
          <span className="text-red-500">Please connect your wallet first</span>
        ) : (
          <span className="text-muted-foreground">
            Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </span>
        )}
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={executing}
        >
          Cancel
        </Button>
        <Button 
          onClick={onExecute}
          disabled={executing || !isConnected}
        >
          {executing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            'Execute Trade'
          )}
        </Button>
      </div>
    </div>
  );
};

export default DialogFooter;
