import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in AFKJ Builder:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] p-6 text-slate-100">
          <div className="card w-full max-w-sm border-amber-500/20 bg-[#161f33] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-black tracking-wide text-white">Something Went Wrong</h1>
            <p className="mt-2 text-xs text-slate-400">
              The application encountered an unexpected state. Click below to reload and refresh cache.
            </p>
            {this.state.error?.message && (
              <p className="mt-3 rounded-lg bg-slate-900/80 p-2 font-mono text-[11px] text-rose-300 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 text-sm font-bold text-slate-950"
            >
              <RefreshCw size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
