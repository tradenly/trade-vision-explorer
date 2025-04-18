
import { useState, useEffect, useRef } from 'react';
import { TransactionStatus } from '@/services/dex/types';

interface ExecutionStep {
  progress: number;
  message: string;
}

export interface ExecutionProgressState {
  progress: number;
  step: string;
  isComplete: boolean;
  isError: boolean;
  details?: {
    txHash?: string;
    explorerUrl?: string;
    gasFee?: number;
    tradingFees?: number;
    priceImpact?: number;
    slippage?: number;
  };
}

// Re-export TransactionStatus for components that import from this file
export { TransactionStatus };

export function useExecutionProgress(
  executing: boolean,
  transactionStatus: TransactionStatus,
  opportunity: { buyDex?: string; network?: string } | null,
  txDetails?: any
) {
  const [state, setState] = useState<ExecutionProgressState>({
    progress: 0,
    step: '',
    isComplete: false,
    isError: false
  });
  
  const progressIntervalRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  
  // Reset progress when dialog closes or execution stops
  useEffect(() => {
    if (!executing) {
      setState({ 
        progress: 0, 
        step: '', 
        isComplete: false,
        isError: false
      });
      currentStepRef.current = 0;
      
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [executing]);
  
  // Handle execution progress
  useEffect(() => {
    if (!executing || !opportunity) {
      return;
    }
    
    const network = opportunity.network || 'ethereum';
    const networkLabel = network === 'solana' ? 'Solana' : 'EVM';
    
    const steps: ExecutionStep[] = [
      { progress: 10, message: `Connecting to ${networkLabel} wallet...` },
      { progress: 20, message: 'Checking token allowance...' },
      { progress: 30, message: 'Preparing transaction...' },
      { progress: 45, message: `Simulating trade on ${opportunity.buyDex || ''}...` },
      { progress: 60, message: `Sending buy transaction...` },
      { progress: 75, message: 'Buy transaction submitted...' },
      { progress: 85, message: `Sending sell transaction...` },
      { progress: 95, message: 'Waiting for confirmation...' },
    ];
    
    // Clear any existing interval
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
    }
    
    if (transactionStatus === TransactionStatus.PENDING) {
      // Start a new interval for pending status
      const intervalId = setInterval(() => {
        if (currentStepRef.current < steps.length) {
          const step = steps[currentStepRef.current];
          setState({
            progress: step.progress,
            step: step.message,
            isComplete: false,
            isError: false
          });
          currentStepRef.current += 1;
        } else {
          clearInterval(intervalId);
        }
      }, 800);
      
      progressIntervalRef.current = intervalId as unknown as number;
      
      // Cleanup interval on unmount
      return () => {
        if (progressIntervalRef.current !== null) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
    
    // Handle special status cases
    if (transactionStatus === TransactionStatus.NEEDS_APPROVAL) {
      setState({
        progress: 25,
        step: 'Waiting for token approval...',
        isComplete: false,
        isError: false
      });
    }
    
    // Handle success status
    if (transactionStatus === TransactionStatus.SUCCESS) {
      setState({
        progress: 100,
        step: 'Transaction complete!',
        isComplete: true,
        isError: false,
        details: txDetails
      });
    }
    
    // Handle error status
    if (transactionStatus === TransactionStatus.ERROR) {
      setState({
        progress: 100,
        step: 'Transaction failed',
        isComplete: true,
        isError: true,
        details: txDetails
      });
    }
    
  }, [executing, opportunity, transactionStatus, txDetails]);
  
  return state;
}
