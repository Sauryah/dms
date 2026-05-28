import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';


interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '260px',
          padding: '2rem',
          background: 'var(--white, #1e293b)',
          border: '1px dashed var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: 'var(--shadow)',
          margin: '1rem 0',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--danger-light, rgba(239, 68, 68, 0.15))',
            color: 'var(--danger, #ef4444)',
            marginBottom: '0.85rem'
          }}>
            <AlertTriangle size={20} />
          </div>
          <h3 style={{
            margin: '0 0 0.4rem 0',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-main, #fff)',
            letterSpacing: '-0.01em'
          }}>
            {this.props.fallbackTitle || 'Telemetry Render Exception'}
          </h3>
          <p style={{
            margin: '0 0 1.25rem 0',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #9ca3af)',
            maxWidth: '380px',
            lineHeight: 1.45
          }}>
            {this.props.fallbackMessage || 'The interactive dashboard module encountered an unexpected state or layout boundary exception.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: '2.25rem',
              padding: '0 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} /> Reset component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
