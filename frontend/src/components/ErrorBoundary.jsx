import React from 'react';

/**
 * Error Boundary — catches unhandled React render errors
 * and shows a styled fallback UI instead of a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('💥 LifeLine AI — Unhandled error caught by boundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw',
          background: '#040c18', color: '#c8e0f4',
          fontFamily: 'monospace', gap: 16, padding: 32,
        }}>
          <div style={{ fontSize: 48 }}>🚨</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#ff3333', letterSpacing: '0.1em' }}>
            SYSTEM ERROR
          </div>
          <div style={{
            fontSize: 13, color: '#ff6666',
            background: '#ff333318', border: '1px solid #ff333344',
            borderRadius: 8, padding: '10px 20px', maxWidth: 560, textAlign: 'center',
          }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{
              marginTop: 8, padding: '10px 28px', borderRadius: 8,
              background: '#00d4ff18', border: '1px solid #00d4ff66',
              color: '#00d4ff', fontSize: 13, cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.08em',
            }}
          >
            ↺ RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
