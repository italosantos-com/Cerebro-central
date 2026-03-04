'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class IframeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Verificar se é um erro relacionado a iframe/cross-origin
    if (error.message.includes('cross-origin') || 
        error.message.includes('SecurityError') || 
        error.message.includes('Failed to read') ||
        error.name === 'SecurityError') {
      console.warn('Erro de segurança iframe capturado pelo ErrorBoundary:', error.message);
      return { hasError: true, error };
    }
    
    // Para outros erros, deixar bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log do erro de iframe
    console.warn('IframeErrorBoundary capturou erro:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      // Renderizar fallback ou continuar normalmente
      return this.props.fallback || this.props.children;
    }

    return this.props.children;
  }
}

export default IframeErrorBoundary;
