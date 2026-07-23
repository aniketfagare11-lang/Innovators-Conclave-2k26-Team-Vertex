import React from 'react';
import { EMERGENCY_PROFILES } from '../utils/aiEngine';

const EMERGENCY_TYPES = [
  'Cardiac Arrest',
  'Heart Attack',
  'Stroke',
  'Accident',
  'Trauma',
  'Burn',
  'Pregnancy',
  'General',
];

const EMERGENCY_ICONS = {
  'Cardiac Arrest': '❤️',
  'Heart Attack':   '💔',
  'Stroke':         '🧠',
  'Accident':       '💥',
  'Trauma':         '🩸',
  'Burn':           '🔥',
  'Pregnancy':      '🤰',
  'General':        '🏥',
};

export default function EmergencyInput({ emergencyType, onChange, phase, emergencyLocation }) {
  // Guard: fall back to 'General' profile if emergencyType key is not recognized
  const profile = EMERGENCY_PROFILES[emergencyType] || EMERGENCY_PROFILES['General'];

  return (
    <div style={{
      background: '#0a1e35',
      border: '1px solid #0f3060',
      borderRadius: 10,
      padding: 14,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 10, color: '#4a7090',
        letterSpacing: '0.15em',
        marginBottom: 10,
      }}>EMERGENCY TYPE</div>

      {/* Type selector: 2 columns, 8 categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {EMERGENCY_TYPES.map(type => {
          const p = EMERGENCY_PROFILES[type] || EMERGENCY_PROFILES['General'];
          const selected = emergencyType === type;
          const icon = EMERGENCY_ICONS[type] || '🏥';
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              disabled={phase === 'enroute' || phase === 'arrived'}
              style={{
                padding: '6px 4px',
                borderRadius: 6,
                border: selected ? `1px solid ${p.color}` : '1px solid #0f3060',
                background: selected ? `${p.color}18` : '#071525',
                color: selected ? p.color : '#4a7090',
                fontFamily: 'var(--font-body)',
                fontSize: 11, fontWeight: selected ? 600 : 400,
                cursor: phase === 'enroute' || phase === 'arrived' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: phase === 'enroute' || phase === 'arrived' ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              <span style={{ fontSize: 10, textAlign: 'left', lineHeight: 1.1, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</span>
            </button>
          );
        })}
      </div>

      {/* Severity badge */}
      <div style={{
        marginTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: `${profile.color}12`,
        border: `1px solid ${profile.color}33`,
        borderRadius: 6,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a7090' }}>
          SEVERITY
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 2,
              background: i < profile.severity ? profile.color : '#0f3060',
              boxShadow: i < profile.severity ? `0 0 4px ${profile.color}80` : 'none',
            }} />
          ))}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10, fontWeight: 700,
            color: profile.color,
            marginLeft: 4, letterSpacing: '0.1em',
          }}>{profile.label}</span>
        </div>
      </div>

      {/* Location status */}
      <div style={{
        marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        background: emergencyLocation ? '#00ff8810' : '#071525',
        border: `1px solid ${emergencyLocation ? '#00ff8833' : '#0f3060'}`,
        borderRadius: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: emergencyLocation ? '#00ff88' : '#4a7090',
          boxShadow: emergencyLocation ? '0 0 6px #00ff88' : 'none',
        }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: emergencyLocation ? '#00ff88' : '#4a7090' }}>
          {emergencyLocation
            ? `📍 ${emergencyLocation.lat.toFixed(4)}, ${emergencyLocation.lng.toFixed(4)}`
            : 'No location selected'}
        </span>
      </div>
    </div>
  );
}
