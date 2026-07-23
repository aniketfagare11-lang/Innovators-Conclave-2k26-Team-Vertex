import React, { useContext } from 'react';
import { SimulationContext } from '../context/SimulationContext';

function Toggle({ label, icon, enabled, onChange, color = '#00d4ff', disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderRadius: 7,
        border: `1px solid ${enabled ? color + '66' : 'var(--border)'}`,
        background: enabled ? `${color}12` : 'var(--surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
        flex: 1,
      }}
    >
      <div style={{
        width: 32, height: 17, borderRadius: 9,
        background: enabled ? color : '#1e3a5f',
        position: 'relative',
        transition: 'background 0.25s',
        flexShrink: 0,
        boxShadow: enabled ? `0 0 8px ${color}60` : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: enabled ? 17 : 2,
          width: 13, height: 13, borderRadius: '50%',
          background: enabled ? 'var(--bg)' : 'var(--muted)',
          transition: 'left 0.25s',
        }} />
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10, color: enabled ? color : '#4a7090',
          letterSpacing: '0.08em', fontWeight: enabled ? 600 : 400,
        }}>
          {icon} {label}
        </div>
      </div>
    </button>
  );
}

export default function ControlPanel({
  trafficEnabled, onTrafficToggle,
  emergencyMode, onEmergencyModeToggle,
  onSimulateTraffic,
  onDispatch,
  onReset,
  simulationSpeed,
  onSimulationSpeedChange,
  phase,
  selectedAmbulance,
  selectedHospital,
}) {
  const { theme, toggleTheme } = useContext(SimulationContext);
  const canDispatch = phase === 'located' && selectedAmbulance && selectedHospital;
  const isActive = phase === 'enroute' || phase === 'arrived';

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0 px-3 py-2 border-t border-gray-200 dark:border-brand-border bg-white dark:bg-gradient-to-r dark:from-[#040c18] dark:via-[#071525] dark:to-[#040c18] transition-colors duration-300">
      {/* Toggles */}
      <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
        <Toggle label="TRAFFIC" icon="🚦" enabled={trafficEnabled} onChange={onTrafficToggle} color="#00d4ff" />
        <Toggle label="PRIORITY" icon="🚨" enabled={emergencyMode} onChange={onEmergencyModeToggle} color="#ff3333" />
        <Toggle label={theme === 'dark' ? 'DARK' : 'LIGHT'} icon={theme === 'dark' ? '🌙' : '☀️'} enabled={theme === 'dark'} onChange={toggleTheme} color="#00d4ff" />
      </div>

      {/* Emergency mode indicator */}
      {emergencyMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          background: 'rgba(255,51,51,0.12)',
          border: '1px solid #ff333344',
          borderRadius: 6,
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3333', boxShadow: '0 0 8px #ff3333' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 8, color: '#ff6666', letterSpacing: '0.1em' }}>
            OVERRIDE
          </span>
        </div>
      )}

      {/* Simulate traffic */}
      <button
        onClick={onSimulateTraffic}
        disabled={!trafficEnabled}
        style={{
          padding: '7px 12px',
          borderRadius: 7,
          border: '1px solid #ffa50033',
          background: '#ffa50012',
          color: '#ffa500',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.04em',
          opacity: trafficEnabled ? 1 : 0.4,
          whiteSpace: 'nowrap',
        }}
      >
        ⚡ SPIKE TRAFFIC
      </button>

      {/* Dispatch / Reset */}
      <div style={{ display: 'flex', gap: 6 }}>
        {!isActive && (
          <button
            onClick={onDispatch}
            disabled={!canDispatch}
            className="btn-dispatch hidden md:block"
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              fontSize: 12,
              cursor: canDispatch ? 'pointer' : 'not-allowed',
              opacity: canDispatch ? 1 : 0.4,
              letterSpacing: '0.08em',
            }}
          >
            🚑 DISPATCH
          </button>
        )}

        <button
          onClick={onReset}
          style={{
            padding: '9px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--muted)',
            fontFamily: 'var(--font-display)',
            fontSize: 10, cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}
        >
          ↺ RESET
        </button>
      </div>

      {/* Simulation Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: isActive ? 0.5 : 1 }}>
        <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>SPEED</span>
        <select
          value={simulationSpeed}
          onChange={e => onSimulationSpeedChange(Number(e.target.value))}
          disabled={isActive}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '4px 6px', borderRadius: '4px', fontSize: 10, outline: 'none',
            cursor: isActive ? 'not-allowed' : 'pointer'
          }}
        >
          <option value={1}>1x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
          <option value={30}>30x</option>
          <option value={60}>60x</option>
          <option value={120}>120x</option>
        </select>
      </div>
    </div>
  );
}
