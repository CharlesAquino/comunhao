import { Component, type ReactNode, type ErrorInfo } from 'react';
import Button from './ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen txt-tertiary p-8 text-center" style={{background: 'var(--body-bg, linear-gradient(180deg, #0f0d1a 0%, #0f0d1a 60%, #0a1a1a 100%))'}}>
          <div className="text-5xl mb-4 opacity-50">✝</div>
          <h2 className="text-xl font-bold txt-primary mb-2">Algo deu errado</h2>
          <p className="text-sm txt-muted mb-6">
            Ocorreu um erro inesperado. Recarregue a página ou tente novamente mais tarde.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="min-h-12 px-6"
          >
            Recarregar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
