import React from 'react';

export default function RightAIPanel({
  scoredRoutes,
  trafficPrediction,
  rerouteStatus,
  globalTrafficState,
  routeMode,
  setRouteMode,
  phase,
  routeMetrics
}) {
  const locked = phase === 'enroute' || phase === 'arrived';
  if (phase === 'idle') return null;

  const bestRoute = scoredRoutes && scoredRoutes.length > 0 ? scoredRoutes[0] : null;
  const currentRoute = scoredRoutes?.find(r => r.id === routeMode) || bestRoute;

  // Extract metrics from the selected route's detailed score (from routeScoring.js)
  // or fallbacks.
  const routeScore = currentRoute ? currentRoute.score : 0;
  
  // Try to find the specific route metric ETA if available
  const activeMetric = routeMetrics && routeMetrics[routeMode];
  const etaDisplay = activeMetric ? `${(activeMetric.duration / 60).toFixed(1)}m` : '—';
  
  // Incident impact logic - routeScoring adds incident penalty
  const incidentPenalty = currentRoute && currentRoute.details ? currentRoute.details.incident : 0;
  
  // Reliability score from routeScoring
  const reliability = currentRoute && currentRoute.details ? currentRoute.details.reliability : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ── AI ROUTE INTELLIGENCE ─────────────────────────────────────── */}
      <div className="glass-card p-3 border-l-2 border-[#00ff88]">
        <div className="font-display text-[10px] text-brand-cyan tracking-widest uppercase mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse"></span>
            AI ROUTE INTELLIGENCE
          </span>
          {locked && <span className="text-brand-amber text-[9px]">LOCKED</span>}
        </div>

        {scoredRoutes && scoredRoutes.length > 0 ? (
          <div className="flex flex-col gap-2">
            {/* Route Selector (Compact) */}
            <div className="flex gap-1 mb-1">
              {scoredRoutes.map((routeObj) => {
                const active = routeMode === routeObj.id;
                return (
                  <button
                    key={routeObj.id}
                    onClick={() => !locked && setRouteMode(routeObj.id)}
                    disabled={locked}
                    className={`flex-1 py-1 px-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors border ${
                      active 
                        ? routeObj.recommendation === 'RECOMMENDED' 
                            ? 'bg-[#00ff88]/20 border-[#00ff88] text-[#00ff88]'
                            : routeObj.recommendation === 'ALTERNATIVE'
                                ? 'bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]'
                                : 'bg-[#c084fc]/20 border-[#c084fc] text-[#c084fc]'
                        : 'bg-black/30 border-brand-border text-brand-muted hover:text-white hover:bg-black/50'
                    }`}
                    style={{ cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    {routeObj.id} {routeObj.recommendation === 'RECOMMENDED' && '⭐'}
                  </button>
                );
              })}
            </div>

            <div className="bg-black/40 p-2 rounded border border-brand-border flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">1</span>
                  <span className="text-brand-muted">RECOMMENDED ROUTE:</span>
                </div>
                <span className={bestRoute?.id === routeMode ? "text-[#00ff88]" : "text-white"}>{bestRoute?.id?.toUpperCase() || 'NONE'}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">2</span>
                  <span className="text-brand-muted">ROUTE SCORE:</span>
                </div>
                <span className="text-[#00ff88] font-bold">{routeScore}/100</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">3</span>
                  <span className="text-brand-muted">ETA:</span>
                </div>
                <span className="text-white">{etaDisplay}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">4</span>
                  <span className="text-brand-muted">CURRENT TRAFFIC:</span>
                </div>
                <span className={globalTrafficState?.severity === 'CRITICAL' ? 'text-[#ff1744]' : globalTrafficState?.severity === 'HEAVY' ? 'text-[#ff9800]' : 'text-[#00ff88]'}>
                  {globalTrafficState?.severity || 'NORMAL'}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">5</span>
                  <span className="text-brand-muted">PREDICTED TRAFFIC:</span>
                </div>
                <span className="text-brand-amber">{trafficPrediction?.predictedSeverity || 'NORMAL'}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">6</span>
                  <span className="text-brand-muted">INCIDENT IMPACT:</span>
                </div>
                <span className={incidentPenalty < -10 ? 'text-[#ff9800]' : 'text-[#00ff88]'}>{incidentPenalty < 0 ? `${incidentPenalty} Pts` : 'NONE'}</span>
              </div>
              
              <div className="flex justify-between items-center border-b border-brand-border/30 pb-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">7</span>
                  <span className="text-brand-muted">RELIABILITY:</span>
                </div>
                <span className="text-brand-cyan">{reliability} Pts</span>
              </div>
              
              <div className="flex justify-between items-center border-t border-brand-border/50 pt-1 mt-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[9px] bg-black/50 text-brand-muted px-1.5 rounded">8</span>
                  <span className="text-brand-muted">REROUTE STATUS:</span>
                </div>
                <span className={rerouteStatus?.includes('STABLE') ? 'text-[#00ff88]' : 'text-[#00d4ff]'}>{rerouteStatus || 'STANDBY'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-brand-muted italic text-center p-2">
            Awaiting routing calculation...
          </div>
        )}
      </div>

      {/* ── AI PREDICTION ─────────────────────────────────────────────── */}
      <div className="glass-card p-3 border-l-2 border-brand-cyan">
        <div className="font-display text-[10px] text-brand-cyan tracking-widest uppercase mb-2">
          AI PREDICTION
        </div>
        <div className="bg-black/40 p-2 rounded border border-brand-border text-[11px] font-mono">
          {trafficPrediction ? (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-brand-muted">TREND:</span>
                <span className={trafficPrediction.trendSlope > 0 ? 'text-[#ff9800]' : 'text-[#00ff88]'}>
                  {trafficPrediction.trendSlope > 0 ? 'WORSENING ↗' : trafficPrediction.trendSlope < 0 ? 'IMPROVING ↘' : 'STABLE →'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">CONFIDENCE:</span>
                <span className="text-brand-cyan">{trafficPrediction.confidence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-muted">+15m CONGESTION:</span>
                <span className="text-white">{trafficPrediction.predictedCongestion}%</span>
              </div>
            </div>
          ) : (
            <div className="text-brand-muted italic text-[10px] text-center">No predictive data</div>
          )}
        </div>
      </div>

      {/* ── REROUTE ENGINE ────────────────────────────────────────────── */}
      <div className="glass-card p-3 border-l-2 border-[#c084fc]">
        <div className="font-display text-[10px] text-[#c084fc] tracking-widest uppercase mb-2">
          REROUTE ENGINE
        </div>
        <div className="bg-black/40 p-2 rounded border border-brand-border text-[11px] font-mono">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-brand-muted">ENGINE:</span>
              <span className={phase === 'enroute' ? 'text-[#00ff88]' : 'text-brand-muted'}>
                {phase === 'enroute' ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">CURRENT STATUS:</span>
              <span className={rerouteStatus?.includes('STABLE') ? 'text-[#00ff88]' : 'text-[#ff9800]'}>
                {rerouteStatus || 'IDLE'}
              </span>
            </div>
            <div className="text-[9px] text-brand-muted mt-1 leading-tight">
              Monitors active route segments for real-time congestion and incidents to trigger alternate paths.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
