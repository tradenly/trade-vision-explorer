
import React, { ReactNode, useEffect } from 'react';
import { Toaster as ToasterComponent } from "./ui/toaster";
import { Toaster as SonnerToaster } from "./ui/sonner";
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';
import { toast } from '@/hooks/use-toast';

interface AppWrapperProps {
  children: ReactNode;
}

const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  // Check for network connection issues
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Back online",
        description: "Your network connection has been restored.",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      toast({
        title: "Network disconnected",
        description: "You appear to be offline. Some features may be unavailable.",
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Global toast notifications */}
      <ToasterComponent />
      <SonnerToaster />
      
      {/* Global error boundary */}
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
};

export default AppWrapper;
