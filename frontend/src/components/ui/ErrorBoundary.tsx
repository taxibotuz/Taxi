import { Component, ReactNode, ErrorInfo } from 'react';
import translations from '../../i18n/translations';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const t = (key: string) => translations.uz[key] || key;
      return (
        <div style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a1a',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              {t('something_wrong')}
            </h1>
            <p style={{ fontSize: '14px', color: '#8e8e93', marginBottom: '24px' }}>
              {this.state.error?.message || t('unexpected_error')}
            </p>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 32px',
                borderRadius: '12px',
                border: 'none',
                background: '#0c8ee7',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('try_again')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
