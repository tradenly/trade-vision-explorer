
import { useState, useEffect, useRef } from 'react';
import { TransactionStatus } from '@/services/dex/types';

interface ExecutionStep {
  progress: number;
  message: string;
}

export interface ExecutionProgressState {
  progress: number;
  step: string;
}

// Re-export TransactionStatus for components that import from this file
export { TransactionStatus };

export function useExecutionProgress(
  executing: boolean,
  transactionStatus: TransactionStatus,
  opportunity: { buyDex?: string } | null
) {
  const [state, setState] = useState<ExecutionProgressState>({
    progress: 0,
    step: '',
  });
  
  const progressIntervalRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  
  // Reset progress when dialog closes or execution stops
  useEffect(() => {
    if (!executing) {
      setState({ progress: 0, step: '' });
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
    
    const steps: ExecutionStep[] = [
      { progress: 10, message: 'Connecting to wallet...' },
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
      });
    }
    
    // Handle success status
    if (transactionStatus === TransactionStatus.SUCCESS) {
      setState({
        progress: 100,
        step: 'Transaction complete!',
      });
    }
    
    // Handle error status
    if (transactionStatus === TransactionStatus.ERROR) {
      setState({
        progress: 100,
        step: 'Transaction failed',
      });
    }
    
  }, [executing, opportunity, transactionStatus]);
  
  return state;
}
