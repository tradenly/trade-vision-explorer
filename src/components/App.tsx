
import React, { ReactNode } from 'react';
import { Toaster as ToasterComponent } from "./ui/toaster";
import { Toaster as SonnerToaster } from "./ui/sonner";
import ErrorBoundary from './ErrorBoundary/ErrorBoundary';

interface AppWrapperProps {
  children: ReactNode;
}

const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
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
