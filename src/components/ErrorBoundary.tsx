import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort safety net. Without this, any uncaught render-time exception
 * anywhere in the tree unmounts the entire app with no output at all — a
 * blank white page and no indication anything went wrong. That's exactly what
 * happened when a browser's persisted edit state (localStorage) predated a
 * newly-added EditParams field: a component received `undefined` where it
 * expected an array and threw, and there was nothing here to catch it.
 *
 * The reset button clears this app's local storage (persisted edit params,
 * crop tool state) and IndexedDB (the cached session file) before reloading —
 * since corrupted/incompatible persisted state is the most likely cause of a
 * crash here, simply reloading would just hit the same exception again.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  private handleReset = async () => {
    try {
      localStorage.clear();
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('lumix-raw-editor');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950 p-6">
        <div className="max-w-sm text-center">
          <p className="mb-2 text-sm text-neutral-300">Something went wrong.</p>
          <p className="mb-4 text-xs text-neutral-500">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-900"
          >
            Reset & reload
          </button>
        </div>
      </div>
    );
  }
}
