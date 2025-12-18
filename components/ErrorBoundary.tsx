'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardTitle, CardContent, Button } from './ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <Card className="max-w-lg w-full">
            <CardTitle className="text-red-600">⚠️ Something went wrong</CardTitle>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  We're sorry, but something unexpected happened. The app has recovered,
                  and you can try again.
                </p>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-2">
                      Error Details (Development Only):
                    </p>
                    <p className="text-xs text-red-700 font-mono break-all">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-700 cursor-pointer hover:text-red-800">
                          Stack Trace
                        </summary>
                        <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={this.handleReset} fullWidth>
                    Try Again
                  </Button>
                  <Button
                    onClick={() => (window.location.href = '/')}
                    variant="secondary"
                    fullWidth
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}

/**
 * Simple error fallback component
 */
export function ErrorFallback({
  error,
  resetError
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button onClick={resetError}>Try Again</Button>
    </div>
  );
}
