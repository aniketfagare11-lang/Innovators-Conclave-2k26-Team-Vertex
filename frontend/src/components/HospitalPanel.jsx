import React from 'react';
import { TRAFFIC_LEVELS } from '../utils/trafficSimulator';
import { getRecommendationReasons } from '../utils/aiEngine';

const RANK_STYLES = {
  1: { border: '#00ff88', bg: 'rgba(0,255,136,0.07)', color: '#00ff88', label: '🥇 TOP MATCH' },
  2: { border: '#00d4ff', bg: 'rgba(0,212,255,0.06)', color: '#00d4ff', label: '🥈 RECOMMENDED' },
  3: { border: '#ffa500', bg: 'rgba(255,165,0,0.06)', color: '#ffa500', label: '🥉 ALTERNATIVE' },
};

function CapBadge({ label, active, color }) {
  return (
    <span style={{
      padding: '1px 5px', borderRadius: 3,
      background: active ? `${color}18` : '#0f306022',
      color: active ? color : '#1e3a5f',
      fontFamily: 'var(--font-mono)', fontSize: 9,
      border: `1px solid ${active ? color + '44' : '#0f306033'}`,
      opacity: active ? 1 : 0.4,
    }}>{label}</span>
  );
}

function ReasonTag({ text, color }) {
  return (
    <span style={{
      padding: '1px 6px',
      borderRadius: 3,
      background: `${color}14`,
      color: color,
      fontFamily: 'var(--font-mono)',
      fontSize: 8,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

function HospitalCard({ hospital, rank, selected, onSelect, emergencyType, allHospitals }) {
  const style = RANK_STYLES[rank] || { border: '#0f3060', bg: '#07152522', color: '#4a7090', label: '' };
  const trafficInfo = TRAFFIC_LEVELS[hospital.trafficLevel] || TRAFFIC_LEVELS.LOW;
  const reasons = getRecommendationReasons(hospital, emergencyType, allHospitals);

  return (
    <div
      onClick={() => onSelect(hospital)}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        border: selected ? `1px solid ${style.border}` : `1px solid ${style.border}44`,
        background: selected ? style.bg : '#07152580',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: selected ? `0 0 15px ${style.border}30` : 'none',
        marginBottom: 6,
        position: 'relative',
      }}
    >
      {style.label && (
        <div style={{
          position: 'absolute', top: -1, right: 8,
          background: style.border,
          color: '#040c18',
          fontFamily: 'var(--font-display)',
          fontSize: 7, fontWeight: 800,
          padding: '1px 6px', borderRadius: '0 0 4px 4px',
          letterSpacing: '0.06em',
        }}>{style.label}</div>
      )}

      {/* Name + Distance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 700,
            color: selected ? style.border : '#c8e0f4',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{hospital.name}</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9, color: '#4a7090', marginTop: 1,
          }}>{hospital.type}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12, color: style.color,
            letterSpacing: '0.05em',
          }}>{hospital.distance} km</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9, color: '#4a7090',
          }}>~{hospital.estimatedTime?.toFixed(0)} min</div>
        </div>
      </div>

      {/* AI Recommendation Reasons */}
      {reasons.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
          {reasons.slice(0, 3).map((r, i) => (
            <ReasonTag key={i} text={r} color={style.color} />
          ))}
        </div>
      )}

      {/* Capability badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        <CapBadge label="❤️ Cardiac" active={hospital.cardiac} color="#ff6666" />
        <CapBadge label="🩹 Trauma"  active={hospital.trauma}  color="#ffa500" />
        <CapBadge label="🧠 Neuro"   active={hospital.neuro}   color="#00d4ff" />
        <CapBadge label="👶 Peds"    active={hospital.pediatric} color="#aa88ff" />
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 6,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090' }}>
            🛏 {hospital.beds}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090' }}>
            ⭐ {hospital.rating}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: trafficInfo.color,
          }}>🚦 {trafficInfo.label}</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 10, color: style.color, fontWeight: 700,
        }}>SCORE: {hospital.score?.toFixed(0)}</div>
      </div>

      {/* Capability progress */}
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090', whiteSpace: 'nowrap' }}>
          CAP {hospital.capability}%
        </span>
        <div style={{ flex: 1, height: 3, background: '#0f3060', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${hospital.capability}%`,
            background: `linear-gradient(90deg, ${style.border}, ${style.border}88)`,
          }} />
        </div>
      </div>
    </div>
  );
}

export default function HospitalPanel({ rankedHospitals, selectedHospital, onSelect, phase, loading, emergencyType }) {
  // After dispatch, only show the allocated hospital
  const dispatched = phase === 'enroute' || phase === 'arrived';
  const displayList = dispatched
    ? rankedHospitals.filter(h => h.id === selectedHospital?.id)
    : rankedHospitals;

  // Fetching from backend
  if (loading) {
    return (
      <div style={{
        background: '#0a1e35', border: '1px solid #0f3060',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          color: '#4a7090', letterSpacing: '0.15em', marginBottom: 10,
        }}>AI HOSPITAL RANKING</div>
        <div style={{
          textAlign: 'center', padding: '20px 0',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a7090',
        }}>
          🔍 Fetching hospitals from OpenStreetMap...
        </div>
      </div>
    );
  }

  if (!displayList.length) {
    return (
      <div style={{
        background: '#0a1e35', border: '1px solid #0f3060',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          color: '#4a7090', letterSpacing: '0.15em', marginBottom: 10,
        }}>AI HOSPITAL RANKING</div>
        <div style={{
          textAlign: 'center', padding: '20px 0',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: '#1e3a5f',
        }}>
          Set emergency location<br />to rank hospitals
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0a1e35', border: '1px solid #0f3060',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          color: '#4a7090', letterSpacing: '0.15em',
        }}>AI HOSPITAL RANKING</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: dispatched ? '#ffa500' : '#00ff88',
        }}>{dispatched ? '✅ ALLOCATED' : `TOP ${displayList.length}`}</div>
      </div>

      {displayList.map((h, i) => (
        <HospitalCard
          key={h.id}
          hospital={h}
          rank={dispatched ? 1 : i + 1}
          selected={selectedHospital?.id === h.id}
          onSelect={dispatched ? () => {} : onSelect}
          emergencyType={emergencyType}
          allHospitals={displayList}
        />
      ))}
    </div>
  );
}
