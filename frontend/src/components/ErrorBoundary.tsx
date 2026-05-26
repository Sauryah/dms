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
          minHeight: '300px',
          padding: '2.5rem',
          background: 'var(--white, #ffffff)',
          border: '1px dashed var(--border, #e2e8f0)',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
          margin: '1.5rem 0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#fef3c7',
            color: '#d97706',
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-main, #1e293b)'
          }}>
            {this.props.fallbackTitle || '3D Render Issue'}
          </h3>
          <p style={{
            margin: '0 0 1.5rem 0',
            fontSize: '0.875rem',
            color: 'var(--text-muted, #64748b)',
            maxWidth: '360px',
            lineHeight: 1.5
          }}>
            {this.props.fallbackMessage || 'The 3D WebGL engine encountered a layout exception or device context loss.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              height: '2.5rem',
              padding: '0 1rem',
              fontSize: '0.875rem'
            }}
          >
            <RefreshCw size={14} /> Retry rendering
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
