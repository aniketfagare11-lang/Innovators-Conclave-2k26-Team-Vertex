import React from 'react';
import { formatETA } from '../utils/aiEngine';
import { TRAFFIC_LEVELS, getOverallTrafficLevel } from '../utils/trafficSimulator';

function StatBox({ label, value, unit, color = '#00d4ff', pulse = false }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '8px 12px',
      background: 'var(--surface)',
      border: `1px solid ${color}33`,
      borderRadius: 8,
      minWidth: 90,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 2,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18, fontWeight: 700,
        color,
        textShadow: `0 0 15px ${color}60`,
        animation: pulse ? 'pulse 1.2s ease-in-out infinite' : 'none',
        lineHeight: 1,
      }}>
        {value}
        {unit && <span style={{ fontSize: 10, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function Dashboard({
  phase,
  selectedAmbulance,
  selectedHospital,
  eta,
  distance,
  routeProgress,
  trafficConditions,
  emergencyMode,
  rerouteCount = 0,
}) {
  if (phase === 'idle') return null;

  const overallTraffic = getOverallTrafficLevel(trafficConditions);
  const trafficLabel = overallTraffic > 0.66 ? 'HIGH' : overallTraffic > 0.33 ? 'MED' : 'LOW';
  const trafficColor = TRAFFIC_LEVELS[trafficLabel === 'MED' ? 'MEDIUM' : trafficLabel]?.color || '#00ff88';

  return (
    <div style={{
      position: 'absolute',
      bottom: 16, left: 16,
      zIndex: 900,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Main stats */}
      <div style={{
        display: 'flex', gap: 6,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 8,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>
        {eta !== null && (
          <StatBox
            label="ETA"
            value={formatETA(eta)}
            color="#00d4ff"
            pulse={phase === 'enroute'}
          />
        )}
        {distance && (
          <StatBox
            label="DISTANCE"
            value={parseFloat(distance).toFixed(1)}
            unit="km"
            color="#00d4ff"
          />
        )}
        {rerouteCount > 0 && (
          <StatBox
            label="REROUTES"
            value={rerouteCount}
            color="#ffa500"
          />
        )}
        <StatBox
          label="TRAFFIC"
          value={trafficLabel}
          color={trafficColor}
        />
      </div>

      {/* Progress bar during route */}
      {phase === 'enroute' && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 12px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
              🚑 {selectedAmbulance?.name} → 🏥 {selectedHospital?.shortName}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 9, color: '#00d4ff' }}>
              {routeProgress}%
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${routeProgress}%`,
              background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
              borderRadius: 2,
              transition: 'width 0.3s ease',
              boxShadow: '0 0 8px rgba(0,212,255,0.6)',
            }} />
          </div>
        </div>
      )}

      {/* Emergency mode indicator */}
      {emergencyMode && (
        <div style={{
          background: 'rgba(255,51,51,0.12)',
          border: '1px solid #ff333344',
          borderRadius: 8, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(12px)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3333', boxShadow: '0 0 8px #ff3333' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#ff6666', letterSpacing: '0.12em' }}>
            🚨 EMERGENCY PRIORITY — SIGNAL OVERRIDE ACTIVE
          </span>
        </div>
      )}

      {/* Arrived state */}
      {phase === 'arrived' && (
        <div style={{
          background: 'rgba(0,255,136,0.12)',
          border: '1px solid #00ff8844',
          borderRadius: 8, padding: '8px 16px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 700,
            color: '#00ff88', letterSpacing: '0.1em',
          }}>✅ PATIENT DELIVERED</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10, color: 'var(--muted)', marginTop: 2,
          }}>Ambulance arrived at {selectedHospital?.name}</div>
        </div>
      )}
    </div>
  );
}
