import React from 'react';

const MODES = [
  {
    id: 'optimal',
    label: 'Optimal',
    icon: '🧠',
    description: 'AI-driven. Auto-reroutes around traffic in real-time.',
    color: '#00ff88',
    bg: 'rgba(0,255,136,0.08)',
    border: '#00ff88',
  },
  {
    id: 'normal',
    label: 'Normal',
    icon: '🛣️',
    description: 'Shortest direct road. No rerouting.',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.07)',
    border: '#00d4ff',
  },
  {
    id: 'alternative',
    label: 'Alternative',
    icon: '🔀',
    description: 'Different road path. Avoids main corridors.',
    color: '#c084fc',
    bg: 'rgba(192,132,252,0.07)',
    border: '#c084fc',
  },
];

function fmt(val, unit) {
  if (val == null) return '—';
  return `${val} ${unit}`;
}

export default function RouteSelector({ routeMode, onChange, phase, routeMetrics }) {
  const locked = phase === 'enroute' || phase === 'arrived';
  if (phase === 'idle') return null;

  const m = routeMetrics || {};
  const hasMetrics = m.normal || m.optimal || m.alternative;

  // Find best time to highlight
  const times = [
    m.optimal?.durationMin,
    m.normal?.durationMin,
    m.alternative?.durationMin,
  ].filter(Boolean);
  const bestTime = times.length ? Math.min(...times) : null;

  const metricFor = (id) => {
    if (id === 'optimal')     return m.optimal;
    if (id === 'normal')      return m.normal;
    if (id === 'alternative') return m.alternative;
    return null;
  };

  return (
    <div style={{ background: '#0a1e35', border: '1px solid #0f3060', borderRadius: 10, padding: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#4a7090', letterSpacing: '0.15em' }}>
          ROUTE MODE
        </div>
        {locked && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#ffa500', letterSpacing: '0.08em' }}>
            🔒 LOCKED
          </div>
        )}
      </div>

      {/* Metrics comparison table — only when real data available */}
      {hasMetrics && (
        <div style={{ background: '#071525', borderRadius: 6, padding: '6px 8px', marginBottom: 10, border: '1px solid #0f3060' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#1e3a5f' }}></span>
            {MODES.map(mode => (
              <span key={mode.id} style={{
                fontFamily: 'var(--font-display)', fontSize: 7, color: mode.color,
                textAlign: 'center', letterSpacing: '0.04em',
              }}>{mode.icon} {mode.label.toUpperCase()}</span>
            ))}
          </div>

          {/* Distance row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, padding: '3px 0', borderBottom: '1px solid #0f306033' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090' }}>DIST</span>
            {MODES.map(mode => {
              const met = metricFor(mode.id);
              return (
                <span key={mode.id} style={{
                  fontFamily: 'var(--font-display)', fontSize: 9,
                  color: '#c8e0f4', textAlign: 'center',
                }}>{fmt(met?.distanceKm, 'km')}</span>
              );
            })}
          </div>

          {/* Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, padding: '3px 0', borderBottom: '1px solid #0f306033' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090' }}>TIME</span>
            {MODES.map(mode => {
              const met = metricFor(mode.id);
              const isBest = met?.durationMin != null && met.durationMin === bestTime;
              return (
                <span key={mode.id} style={{
                  fontFamily: 'var(--font-display)', fontSize: 9,
                  color: isBest ? mode.color : '#c8e0f4',
                  textAlign: 'center', fontWeight: isBest ? 700 : 400,
                }}>{fmt(met?.durationMin, 'min')}</span>
              );
            })}
          </div>

          {/* Traffic row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, paddingTop: 3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090' }}>TRAFFIC</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#00c853', textAlign: 'center' }}>AWARE</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090', textAlign: 'center' }}>IGNORED</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090', textAlign: 'center' }}>IGNORED</span>
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODES.map(mode => {
          const active = routeMode === mode.id;
          const met = metricFor(mode.id);
          return (
            <button
              key={mode.id}
              onClick={() => !locked && onChange(mode.id)}
              disabled={locked}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, width: '100%',
                border: `1px solid ${active ? mode.border : mode.border + '33'}`,
                background: active ? mode.bg : 'transparent',
                cursor: locked ? 'default' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: active ? `0 0 12px ${mode.border}25` : 'none',
                textAlign: 'left',
                opacity: locked && !active ? 0.45 : 1,
              }}
            >
              <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{mode.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 11,
                    color: active ? mode.color : '#c8e0f4',
                    letterSpacing: '0.06em', fontWeight: 700,
                  }}>{mode.label}</span>
                  {active && !locked && (
                    <span style={{
                      background: mode.color, color: '#040c18',
                      fontFamily: 'var(--font-mono)', fontSize: 7,
                      padding: '1px 5px', borderRadius: 3, fontWeight: 800,
                    }}>ACTIVE</span>
                  )}
                  {active && locked && (
                    <span style={{
                      background: '#ffa500', color: '#040c18',
                      fontFamily: 'var(--font-mono)', fontSize: 7,
                      padding: '1px 5px', borderRadius: 3, fontWeight: 800,
                    }}>{phase === 'enroute' ? 'EN ROUTE' : 'ARRIVED'}</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090', lineHeight: 1.4 }}>
                  {mode.description}
                  {met?.distanceKm && (
                    <span style={{ color: active ? mode.color : '#4a7090', marginLeft: 4 }}>
                      · {met.distanceKm} km · {met.durationMin} min
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${active ? mode.color : '#1e3a5f'}`,
                background: active ? mode.color : 'transparent',
                transition: 'all 0.2s',
                boxShadow: active ? `0 0 6px ${mode.color}` : 'none',
              }} />
            </button>
          );
        })}
      </div>

      {/* Active mode note */}
      {!locked && routeMode === 'optimal' && (
        <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 5, background: '#00ff8810', border: '1px solid #00ff8820', fontFamily: 'var(--font-mono)', fontSize: 8, color: '#00ff88' }}>
          ⚡ Auto-reroutes if traffic exceeds 40% congestion
        </div>
      )}
      {!locked && routeMode === 'normal' && (
        <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 5, background: '#00d4ff10', border: '1px solid #00d4ff20', fontFamily: 'var(--font-mono)', fontSize: 8, color: '#00d4ff' }}>
          🛣️ Shortest distance · No rerouting during dispatch
        </div>
      )}
      {!locked && routeMode === 'alternative' && (
        <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 5, background: '#c084fc10', border: '1px solid #c084fc20', fontFamily: 'var(--font-mono)', fontSize: 8, color: '#c084fc' }}>
          🔀 Different road corridor · May be longer but less congested
        </div>
      )}
      {locked && routeMode === 'optimal' && (
        <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 5, background: '#ffa50010', border: '1px solid #ffa50030', fontFamily: 'var(--font-mono)', fontSize: 8, color: '#ffa500' }}>
          🔄 Dynamic rerouting active — monitoring traffic
        </div>
      )}
    </div>
  );
}
