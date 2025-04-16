
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  loading: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      loading: false
    };
  }

  static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error: null,
      errorInfo: null,
      loading: false 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error information
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ 
      loading: true 
    });

    // Simulate a slight delay to show loading state
    setTimeout(() => {
      this.setState({ 
        hasError: false,
        error: null,
        errorInfo: null,
        loading: false
      });
      
      // Call custom reset function if provided
      if (this.props.onReset) {
        this.props.onReset();
      }
    }, 800);
  }

  render() {
    const { hasError, loading } = this.state;
    const { children, fallback } = this.props;
    
    if (hasError) {
      // Custom fallback or default error UI
      if (fallback) {
        return fallback;
      }
      
      return (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 text-center">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <AlertOctagon className="h-12 w-12 text-red-500 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold">Something went wrong</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There was an error loading this component
                </p>
              </div>
              <Button 
                onClick={this.handleReset} 
                disabled={loading}
                className="mt-2"
                variant="outline"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> 
                    Reset Component
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
