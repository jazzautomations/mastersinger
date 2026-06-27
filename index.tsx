import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { warmAudioOnUserGesture } from './services/audioService';

// Unlock Web Audio on the very first user interaction (critical for iOS Safari).
warmAudioOnUserGesture();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="text-6xl">🎤</div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Something went out of tune.</h1>
            <p className="text-slate-400 text-sm">Reload the page to start again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-violet-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-violet-500 transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
