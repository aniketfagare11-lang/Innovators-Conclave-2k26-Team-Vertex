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

export default function RouteSelector({ routeMode, onChange, phase, routeMetrics, scoredRoutes = [] }) {
  const locked = phase === 'enroute' || phase === 'arrived';
  if (phase === 'idle') return null;

  const hasScores = scoredRoutes.length > 0;

  return (
    <div style={{ background: '#0a1e35', border: '1px solid #0f3060', borderRadius: 10, padding: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#4a7090', letterSpacing: '0.15em' }}>
          AI ROUTE RECOMMENDATION
        </div>
        {locked && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#ffa500', letterSpacing: '0.08em' }}>
            🔒 LOCKED
          </div>
        )}
      </div>
      
      {!hasScores && (
        <div style={{ padding: 10, textAlign: 'center', color: '#4a7090', fontSize: 11 }}>
          Calculating routes...
        </div>
      )}

      {/* Mode cards */}
      {hasScores && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {scoredRoutes.map((routeObj, idx) => {
            const active = routeMode === routeObj.id;
            
            // Determine styling based on rank
            let color = '#c8e0f4';
            let bg = 'transparent';
            let border = '#c8e0f433';
            let icon = '🔄';
            
            if (routeObj.recommendation === 'RECOMMENDED') {
              color = '#00ff88';
              bg = active ? 'rgba(0,255,136,0.08)' : 'transparent';
              border = active ? '#00ff88' : '#00ff8833';
              icon = '⭐';
            } else if (routeObj.recommendation === 'ALTERNATIVE') {
              color = '#00d4ff';
              bg = active ? 'rgba(0,212,255,0.07)' : 'transparent';
              border = active ? '#00d4ff' : '#00d4ff33';
              icon = '🔀';
            } else {
              color = '#c084fc';
              bg = active ? 'rgba(192,132,252,0.07)' : 'transparent';
              border = active ? '#c084fc' : '#c084fc33';
              icon = '🛣️';
            }
            
            return (
              <button
                key={routeObj.id}
                onClick={() => !locked && onChange(routeObj.id)}
                disabled={locked}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  padding: '9px 12px', borderRadius: 8, width: '100%',
                  border: `1px solid ${border}`,
                  background: bg,
                  cursor: locked ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: active ? `0 0 12px ${color}25` : 'none',
                  textAlign: 'left',
                  opacity: locked && !active ? 0.45 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                  <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 11,
                        color: active ? color : '#c8e0f4',
                        letterSpacing: '0.06em', fontWeight: 700,
                      }}>{routeObj.recommendation}</span>
                      <span style={{
                        background: '#071525', color: '#c8e0f4', border: '1px solid #1e3a5f',
                        fontFamily: 'var(--font-mono)', fontSize: 9,
                        padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                      }}>Score: {routeObj.finalScore}/100</span>
                      
                      {active && locked && (
                        <span style={{
                          background: '#ffa500', color: '#040c18',
                          fontFamily: 'var(--font-mono)', fontSize: 7,
                          padding: '1px 5px', borderRadius: 3, fontWeight: 800, marginLeft: 'auto'
                        }}>{phase === 'enroute' ? 'EN ROUTE' : 'ARRIVED'}</span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090', marginTop: 4 }}>
                      <span><strong style={{color: '#c8e0f4'}}>{routeObj.raw.etaMin} min</strong> ETA</span>
                      <span><strong style={{color: '#c8e0f4'}}>{routeObj.raw.distanceKm} km</strong> Dist</span>
                      <span><strong style={{color: routeObj.raw.congestion > 50 ? '#ff8800' : '#00ff88'}}>{routeObj.raw.congestion}%</strong> Traffic</span>
                      <span><strong style={{color: routeObj.raw.predictedCongestion > 50 ? '#ff3333' : '#00d4ff'}}>{routeObj.raw.predictedCongestion}%</strong> Pred</span>
                    </div>
                  </div>
                  
                  <div style={{
                    width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? color : '#1e3a5f'}`,
                    background: active ? color : 'transparent',
                    transition: 'all 0.2s',
                    boxShadow: active ? `0 0 6px ${color}` : 'none',
                  }} />
                </div>
                
                {/* Explanation engine expansion */}
                {active && routeObj.explanation && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${border}`, fontSize: 9, color: '#8ea8c0' }}>
                    <div style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', color: color, marginBottom: 4, fontSize: 8, textTransform: 'uppercase' }}>Why this route?</div>
                    <ul style={{ margin: 0, paddingLeft: 12, listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {routeObj.explanation.map((reason, i) => (
                        <li key={i} style={{ position: 'relative' }}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Factor Breakdown */}
                {active && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, height: 4, borderRadius: 2, overflow: 'hidden', background: '#040c18' }}>
                     <div style={{ width: `${(routeObj.factors.eta * routeObj.weights.ETA)}%`, background: '#00d4ff' }} title="ETA" />
                     <div style={{ width: `${(routeObj.factors.currentTraffic * routeObj.weights.CURRENT_TRAFFIC)}%`, background: '#ff8800' }} title="Traffic" />
                     <div style={{ width: `${(routeObj.factors.predictedTraffic * routeObj.weights.PREDICTED_TRAFFIC)}%`, background: '#ff3333' }} title="Prediction" />
                     <div style={{ width: `${(routeObj.factors.incidentImpact * routeObj.weights.INCIDENT_IMPACT)}%`, background: '#ffd600' }} title="Incidents" />
                     <div style={{ width: `${(routeObj.factors.distance * routeObj.weights.DISTANCE)}%`, background: '#c084fc' }} title="Distance" />
                     <div style={{ width: `${(routeObj.factors.reliability * routeObj.weights.RELIABILITY)}%`, background: '#00ff88' }} title="Reliability" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 7, color: '#4a7090' }}>
        Decision based on configurable multi-factor emergency route scoring.
      </div>
    </div>
  );
}
