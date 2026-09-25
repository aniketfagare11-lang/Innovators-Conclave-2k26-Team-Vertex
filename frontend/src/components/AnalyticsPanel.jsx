import React from 'react';

export default function AnalyticsPanel({
  activeEmergencies,
  activeIncidents,
  ambulances,
  scoredRoutes,
  rerouteCount,
  corridorIntersections,
  globalTrafficState,
  trafficPrediction,
}) {
  const formatStat = (val) => val != null ? val : '—';

  const stats = [
    { label: 'ACTIVE EMERGENCIES', value: formatStat(activeEmergencies), color: '#00d4ff' },
    { label: 'ACTIVE INCIDENTS', value: formatStat(activeIncidents), color: activeIncidents > 0 ? '#ff3333' : '#00ff88' },
    { label: 'ACTIVE AMBULANCES', value: ambulances ? ambulances.filter(a => a.status === 'busy').length : '—', color: '#ffa500' },
    { label: 'ROUTES EVALUATED', value: scoredRoutes ? scoredRoutes.length : '—', color: '#c084fc' },
    { label: 'REROUTES', value: formatStat(rerouteCount), color: rerouteCount > 0 ? '#ff9800' : '#4a7090' },
    { label: 'CORRIDOR INTERSECTIONS', value: corridorIntersections ? corridorIntersections.length : '—', color: corridorIntersections?.length > 0 ? '#00ff88' : '#4a7090' },
    { label: 'CURRENT CONGESTION', value: globalTrafficState ? `${globalTrafficState.congestionScore}%` : '—', color: '#ffd600' },
    { label: 'PREDICTED CONGESTION', value: trafficPrediction ? `${trafficPrediction.predictedCongestion}%` : '—', color: '#ff3333' }
  ];

  return (
    <div className="glass-card p-3 flex flex-col gap-2 h-full border-t-2 border-brand-cyan/40">
      <div className="font-display text-[10px] text-brand-muted tracking-widest uppercase mb-1 flex justify-between">
        <span>Operational Analytics</span>
        <span className="text-brand-cyan/60 text-[9px] uppercase tracking-wider">Simulation</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="bg-black/20 border border-brand-border/50 rounded-lg p-2 flex flex-col justify-center">
             <div className="font-mono text-[8px] text-brand-muted tracking-widest uppercase mb-1">{stat.label}</div>
             <div className="font-display text-lg font-bold" style={{ color: stat.color, textShadow: `0 0 10px ${stat.color}40` }}>
               {stat.value}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
