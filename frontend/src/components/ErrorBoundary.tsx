import { Component, ReactNode, ErrorInfo } from 'react';
import { frontendErrorReporter } from '../services/errorReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    frontendErrorReporter.captureError(error, {
      type: 'react_error_boundary',
      metadata: { componentStack: errorInfo.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-primary-500 rounded-xl text-sm font-semibold"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
