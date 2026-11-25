import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string; path?: string };
        if (parsed?.error) {
          friendly = `${parsed.error} (${parsed.operationType || 'operation'} on ${parsed.path || 'record'})`;
        }
      } catch {
        // plain error string
      }

      return (
        <div className="min-h-screen bg-[#F8FAF7] dark:bg-[#0B1410] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#111C16] border border-slate-200 dark:border-emerald-950 rounded-2xl p-8 shadow-sm">
            <p className="text-xs font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
              Application Recovery
            </p>
            <h1 className="text-xl font-bold text-[#102A43] dark:text-white mb-3">
              Something interrupted the workspace
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium bg-[#14532D] hover:bg-[#16A34A] text-white rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
