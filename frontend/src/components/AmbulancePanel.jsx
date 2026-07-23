import React from 'react';
import { TRAFFIC_LEVELS } from '../utils/trafficSimulator';

function TrafficBadge({ level }) {
  const info = TRAFFIC_LEVELS[level] || TRAFFIC_LEVELS.LOW;
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 4,
      background: `${info.color}22`, color: info.color,
      fontFamily: 'var(--font-mono)', fontSize: 9,
      border: `1px solid ${info.color}44`,
    }}>{info.label}</span>
  );
}

/** Small labelled tag */
function InfoTag({ icon, label, value, color = '#4a7090' }) {
  return (
    <span style={{
      padding: '1px 6px', borderRadius: 4,
      background: `${color}12`,
      color,
      fontFamily: 'var(--font-mono)', fontSize: 9,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {icon && <span style={{ marginRight: 2 }}>{icon}</span>}
      {label && <span style={{ color: '#4a7090', marginRight: 2 }}>{label}</span>}
      {value}
    </span>
  );
}

function AmbulanceCard({ ambulance, selected, onSelect, rank, trafficConditions }) {
  const trafficLevel = trafficConditions[`amb_${ambulance.id}`] || 'LOW';

  // Status color mapping
  const statusColor =
    ambulance.status === 'available'    ? '#00ff88' :
    ambulance.status === 'returning'    ? '#00d4ff' :
    ambulance.status === 'busy'         ? '#ffa500' :
    ambulance.status === 'maintenance'  ? '#ff5555' : '#4a7090';

  // Equipment type → badge color
  const equipColor =
    ambulance.equipmentType === 'ICU'     ? '#ff3333' :
    ambulance.equipmentType === 'ALS'     ? '#ff8800' :
    ambulance.equipmentType === 'Cardiac' ? '#ff6666' :
    ambulance.equipmentType === 'Trauma'  ? '#ffa500' :
    '#4a7090';

  return (
    <div
      onClick={() => onSelect(ambulance)}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        border: selected
          ? '1px solid #00d4ff'
          : rank === 1
            ? '1px solid #00ff8844'
            : '1px solid #0f3060',
        background: selected
          ? 'rgba(0,212,255,0.08)'
          : rank === 1
            ? 'rgba(0,255,136,0.04)'
            : '#071525',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: selected ? '0 0 15px rgba(0,212,255,0.2)' : 'none',
        marginBottom: 6,
        position: 'relative',
      }}
    >
      {/* AI Best badge */}
      {rank === 1 && (
        <div style={{
          position: 'absolute', top: -1, right: 8,
          background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
          color: '#040c18',
          fontFamily: 'var(--font-display)',
          fontSize: 8, fontWeight: 800,
          padding: '1px 6px', borderRadius: '0 0 4px 4px',
          letterSpacing: '0.08em',
        }}>AI BEST</div>
      )}

      {/* Row 1: Name + Distance */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🚑</span>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 12, fontWeight: 700,
              color: selected ? '#00d4ff' : '#c8e0f4',
              letterSpacing: '0.08em',
            }}>{ambulance.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090' }}>
              {ambulance.type}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11, color: '#00d4ff',
            letterSpacing: '0.05em',
          }}>{ambulance.distance?.toFixed(1) || '?'} km</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a7090' }}>
            ~{ambulance.estimatedArrival?.toFixed(0) || '?'} min
          </div>
        </div>
      </div>

      {/* Row 2: Status + Traffic */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <TrafficBadge level={trafficLevel} />
        <span style={{
          padding: '1px 6px', borderRadius: 4,
          background: `${statusColor}18`,
          color: statusColor,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          border: `1px solid ${statusColor}44`,
        }}>
          {(ambulance.status || 'available').toUpperCase()}
        </span>
        {ambulance.equipmentType && (
          <InfoTag icon="🏥" value={ambulance.equipmentType} color={equipColor} />
        )}
      </div>

      {/* Row 3: Enriched fields — driver, crew, speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
        {ambulance.driver && (
          <InfoTag icon="👤" value={ambulance.driver.replace('Driver ', '')} color="#4a9090" />
        )}
        {ambulance.crewSize != null && (
          <InfoTag icon="👥" label="Crew" value={ambulance.crewSize} color="#4a7090" />
        )}
        {ambulance.speed != null && ambulance.speed > 0 && (
          <InfoTag icon="⚡" label="" value={`${ambulance.speed} km/h`} color="#00d4ff" />
        )}
      </div>

      {/* Row 4: Equipment score + rank */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: '#4a7090',
        }}>
          ⚙️ Equip {ambulance.equipment}%
          <span style={{ marginLeft: 4, color: '#00d4ff', fontWeight: 600 }}>#{rank}</span>
        </div>
      </div>

      {/* Equipment bar */}
      <div style={{
        marginTop: 6, height: 2,
        background: '#0f3060', borderRadius: 1, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${ambulance.equipment}%`,
          background: `linear-gradient(90deg, #00d4ff, #00ff88)`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

export default function AmbulancePanel({ ambulances, selectedAmbulance, onSelect, trafficConditions, phase }) {
  if (!ambulances.length) {
    return (
      <div style={{
        background: '#0a1e35', border: '1px solid #0f3060',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          color: '#4a7090', letterSpacing: '0.15em', marginBottom: 10,
        }}>AMBULANCE UNITS</div>
        <div style={{
          textAlign: 'center', padding: '20px 0',
          fontFamily: 'var(--font-mono)', fontSize: 11, color: '#1e3a5f',
        }}>
          Set emergency location<br />to generate units
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
        }}>AMBULANCE UNITS</div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: '#00d4ff',
        }}>{ambulances.length} UNITS NEARBY</div>
      </div>

      <div>
        {ambulances.map((amb, i) => (
          <AmbulanceCard
            key={amb.id}
            ambulance={amb}
            selected={selectedAmbulance?.id === amb.id}
            onSelect={onSelect}
            rank={i + 1}
            trafficConditions={trafficConditions}
          />
        ))}
      </div>
    </div>
  );
}
