import React from 'react';

export default function DemoOverlay({
  demoActive,
  demoMode,
  setDemoMode,
  demoPhaseName,
  demoNextPhaseName,
  demoProgress,
  onStartDemo,
  onPauseDemo,
  onResetDemo,
  onNextDemoStep,
  onPrevDemoStep,
  
  // Context Data
  emergencyType,
  scoredRoutes,
  trafficPrediction,
  incidents,
  rerouteStatus,
  globalTrafficState,
  dispatchTimeline
}) {
  if (!demoActive && demoPhaseName === 'IDLE') {
    return (
      <div className="w-full flex flex-col items-center gap-2 p-2 mb-2">
         {/* Mode Switcher */}
         <div className="flex bg-black/50 border border-brand-border rounded-lg overflow-hidden p-1 backdrop-blur-sm">
            <button
              onClick={() => setDemoMode('JUDGE')}
              className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${demoMode === 'JUDGE' ? 'bg-[#c084fc] text-white' : 'text-brand-muted hover:text-white'}`}
            >
              ⚡ JUDGE DEMO
            </button>
            <button
              onClick={() => setDemoMode('LIVE')}
              className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${demoMode === 'LIVE' ? 'bg-[#00ff88] text-black' : 'text-brand-muted hover:text-white'}`}
            >
              🧑‍🏫 LIVE EXPLAIN
            </button>
         </div>

         <button
           onClick={onStartDemo}
           className={`px-6 py-2 ${demoMode === 'JUDGE' ? 'bg-[#c084fc] shadow-[0_0_15px_#c084fc60]' : 'bg-[#00ff88] text-black shadow-[0_0_15px_#00ff8860]'} text-white rounded-lg font-bold text-xs tracking-widest uppercase transition-colors`}
         >
           ▶ START {demoMode === 'JUDGE' ? 'AUTOMATED' : 'MANUAL'} DEMO
         </button>
      </div>
    );
  }

  const renderExplanation = () => {
    switch(demoPhaseName) {
      case 'EMERGENCY_CREATED': return (
        <>
          <div className="font-bold text-brand-red mb-2 text-sm">🚨 EMERGENCY RECEIVED</div>
          <div className="text-xs text-gray-300 leading-relaxed">An emergency request has entered the command center. The system identifies an ambulance and destination.</div>
        </>
      );
      case 'ROUTES_READY': return (
        <>
          <div className="font-bold text-brand-cyan mb-2 text-sm">🗺️ ROUTE INTELLIGENCE</div>
          <div className="text-xs text-gray-300 mb-1">Processing multiple paths...</div>
          <div className="text-xs text-brand-cyan mt-2">The system evaluates shortest, optimal, and alternative paths simultaneously.</div>
        </>
      );
      case 'ROUTE_RECOMMENDED': 
        const bestRoute = scoredRoutes && scoredRoutes.length > 0 ? scoredRoutes[0] : null;
        return (
        <>
          <div className="font-bold text-green-400 mb-2 text-sm">🤖 AI ROUTE INTELLIGENCE</div>
          <div className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded inline-block mb-2 font-bold tracking-widest uppercase">
            Multi-factor route scoring
          </div>
          <div className="text-xs text-gray-300 mb-2">3 ROUTES ANALYZED</div>
          <div className="bg-black/30 p-2 rounded mb-2 border border-brand-border">
             <div className="text-[10px] text-gray-400 mb-1 tracking-widest uppercase">EVALUATION METRICS:</div>
             <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-[10px] text-gray-300">
               <div><span className="text-green-400">✓</span> Current traffic</div>
               <div><span className="text-green-400">✓</span> Predicted traffic</div>
               <div><span className="text-green-400">✓</span> Incident impact</div>
               <div><span className="text-green-400">✓</span> ETA</div>
               <div><span className="text-green-400">✓</span> Distance</div>
               <div><span className="text-green-400">✓</span> Reliability</div>
             </div>
          </div>
          {bestRoute && (
            <div className="bg-black/40 p-2 rounded text-xs border border-green-500/30">
              <div className="text-gray-400 text-[9px] mb-1 tracking-widest uppercase">RECOMMENDED ROUTE</div>
              <div className="text-green-400 font-bold mb-1">Route {bestRoute.id.toUpperCase()} — Score: {bestRoute.score}/100</div>
              <div className="text-gray-400 font-mono text-[10px] mt-2 mb-0.5">WHY?</div>
              <div className="text-gray-300 text-[10px]">Trend-based predictive traffic intelligence indicates lower congestion and better ETA.</div>
            </div>
          )}
        </>
      );
      case 'CORRIDOR_ACTIVE': return (
        <>
          <div className="font-bold text-yellow-400 mb-2 text-sm">🚦 EMERGENCY CORRIDOR</div>
          <div className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-1 rounded inline-block mb-2 font-bold tracking-widest">
            SIMULATED SIGNAL PRIORITY
          </div>
          <div className="text-xs text-gray-300 mb-2">This is a software simulation of signal-priority coordination. We are not controlling physical traffic signals.</div>
          <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between font-mono bg-black/30 p-2 rounded border border-yellow-500/30">
            <span className="text-yellow-400">PREPARING</span> <span className="text-gray-600">→</span> 
            <span className="text-green-400">PRIORITY</span> <span className="text-gray-600">→</span> 
            <span>CLEARED</span>
          </div>
        </>
      );
      case 'AMBULANCE_MOVING': return (
        <>
          <div className="font-bold text-blue-400 mb-2 text-sm">🚑 AMBULANCE STATUS</div>
          <div className="bg-black/40 p-2 rounded text-xs border border-blue-500/30">
             <div className="text-gray-300">Status: <span className="text-blue-300 font-bold">EN ROUTE</span></div>
             <div className="text-gray-400 font-mono text-[10px] mt-1">The ambulance is dynamically tracking along the road-snapped geometry.</div>
          </div>
        </>
      );
      case 'TRAFFIC_SPIKE': 
        return (
        <>
          <div className="font-bold text-orange-400 mb-2 text-sm">📈 TRAFFIC INTELLIGENCE</div>
          <div className="text-xs text-gray-300 mb-2 italic">Traffic surge detected. Evaluating impact...</div>
          <div className="grid grid-cols-2 gap-2 text-xs border border-orange-500/30 bg-black/40 p-2 rounded">
             <div className="flex flex-col">
               <span className="text-[9px] text-gray-400 uppercase tracking-widest">Current</span>
               <span className="text-orange-400 font-mono font-bold text-sm">{globalTrafficState?.intensity ? Math.round(globalTrafficState.intensity * 100) : 0}%</span>
             </div>
             <div className="flex flex-col">
               <span className="text-[9px] text-gray-400 uppercase tracking-widest">Predicted</span>
               <span className="text-red-400 font-mono font-bold text-sm">{trafficPrediction?.predictedCongestion || (globalTrafficState?.intensity ? Math.round(globalTrafficState.intensity * 100) + 15 : 0)}%</span>
             </div>
             <div className="flex flex-col mt-1">
               <span className="text-[9px] text-gray-400 uppercase tracking-widest">Trend</span>
               <span className="text-red-400 font-mono text-[10px]">WORSENING ↑</span>
             </div>
             <div className="flex flex-col mt-1">
               <span className="text-[9px] text-gray-400 uppercase tracking-widest">Source</span>
               <span className="text-gray-300 font-mono text-[10px]">SIMULATION</span>
             </div>
          </div>
        </>
      );
      case 'INCIDENT_CREATED': 
        const inc = incidents && incidents.length > 0 ? incidents[incidents.length - 1] : null;
        return (
        <>
          <div className="font-bold text-red-500 mb-2 text-sm">⚠️ INCIDENT IMPACT</div>
          <div className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded inline-block mb-2 font-bold tracking-widest">
            SIMULATED INCIDENT
          </div>
          <div className="text-xs text-gray-300 mb-2">The incident changes the expected travel conditions on the active route.</div>
          {inc && (
            <div className="bg-black/40 p-2 rounded text-xs border border-red-500/30 grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Type</span>
                <span className="text-white font-bold">{inc.type}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Severity</span>
                <span className="text-red-400 font-bold">{inc.severity}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Estimated Delay</span>
                <span className="text-orange-400 font-mono">+{inc.estimatedDelay} min</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest">Affected Route</span>
                <span className="text-red-400 font-mono">CURRENT (Optimal)</span>
              </div>
            </div>
          )}
        </>
      );
      case 'REROUTING': return (
        <>
          <div className="font-bold text-purple-400 mb-2 text-sm">🔄 DYNAMIC REROUTING</div>
          <div className="text-xs text-gray-300 mb-2">High incident impact and increased predicted congestion detected.</div>
          
          <div className="flex flex-col gap-1 mb-2">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest">Alternatives Evaluated:</div>
            {scoredRoutes && scoredRoutes.map(r => (
              <div key={r.id} className="text-[10px] font-mono flex justify-between bg-black/20 p-1 px-2 rounded">
                <span>Route {r.id.toUpperCase()}</span>
                <span className={r.score > 80 ? 'text-green-400' : 'text-orange-400'}>{r.score} / 100</span>
              </div>
            ))}
          </div>

          <div className="bg-purple-900/20 p-2 rounded text-xs border border-purple-500/50 text-purple-300 font-bold flex flex-col gap-1">
            <div className="flex items-center gap-2"><span className="text-green-400">✓</span> BETTER ROUTE FOUND</div>
            <div className="text-white">REROUTING → {scoredRoutes && scoredRoutes.length > 0 ? 'Route ' + scoredRoutes[0].id.toUpperCase() : 'Alternative Route'}</div>
          </div>
        </>
      );
      case 'NEW_CORRIDOR': return (
        <>
          <div className="font-bold text-green-400 mb-2 text-sm">🚦 NEW CORRIDOR</div>
          <div className="text-[10px] text-red-400 line-through mb-1 bg-red-900/20 p-1 rounded">OLD CORRIDOR INVALIDATED</div>
          <div className="text-[11px] text-green-400 font-bold mb-2 bg-green-900/20 p-1 rounded border border-green-500/30">🟢 NEW EMERGENCY CORRIDOR ACTIVATED</div>
          <div className="text-xs text-gray-300">The new corridor is based on the dynamically selected reroute.</div>
        </>
      );
      case 'COMPLETED': return (
        <>
          <div className="font-bold text-[#c084fc] mb-2 text-sm">🏁 RESPONSE COMPLETED</div>
          <ul className="text-xs text-gray-300 space-y-1 bg-black/30 p-3 rounded border border-brand-border">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Emergency processed</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Route optimized</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Traffic analyzed</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Incident handled</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Dynamic rerouting completed</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span> New corridor established</li>
          </ul>
        </>
      );
      default: return null;
    }
  };

  const isLive = demoMode === 'LIVE';
  const color = isLive ? '#00ff88' : '#c084fc';
  
  // Progress circles
  const steps = 10;
  const currentStepNum = Math.round((demoProgress / 100) * steps);

  return (
    <div className="w-full h-auto p-2 mb-2">
      <div className="bg-[#040c18] border border-brand-border rounded-xl p-3 shadow-lg relative overflow-hidden" style={{ borderColor: color }}>
        
        {/* Progress bar background */}
        <div 
          className="absolute top-0 left-0 h-1 transition-all duration-300"
          style={{ width: `${demoProgress}%`, backgroundColor: color }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-brand-border/50">
          <div className="font-display text-[11px] font-bold tracking-[0.2em] uppercase flex items-center gap-2" style={{ color }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            {isLive ? '🧑‍🏫 LIVE EXPLAIN' : '⚡ JUDGE DEMO'}
          </div>
          <div className="font-mono text-[10px] text-brand-text font-bold">
            STEP {currentStepNum} / {steps}
          </div>
        </div>

        {/* Dots progress indicator */}
        <div className="flex justify-between items-center mb-4 px-1">
           {['Emergency', 'Routes', 'AI', 'Corridor', 'Movement', 'Traffic', 'Incident', 'Reroute', 'New Path', 'Complete'].map((label, i) => {
              const active = i < currentStepNum;
              const isCurrent = i === currentStepNum - 1 || (currentStepNum === 0 && i === 0);
              return (
                <div key={i} className="flex flex-col items-center gap-1 w-10">
                  <div 
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-current' : 'bg-brand-border'} ${isCurrent ? 'ring-2 ring-current ring-offset-1 ring-offset-brand-surface' : ''}`}
                    style={{ color: active ? color : '' }}
                  />
                  <span className={`text-[8px] uppercase tracking-wider text-center ${active ? 'text-gray-300' : 'text-gray-600'} ${isCurrent ? 'font-bold' : ''}`}>
                    {label}
                  </span>
                </div>
              );
           })}
        </div>

        {/* Stage Content */}
        <div className="min-h-[140px] mb-4">
           {renderExplanation()}
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-2 justify-between border-t border-brand-border/50 pt-3">
           
           {/* Left side controls */}
           <div className="flex gap-2 w-full">
             {isLive ? (
               <>
                 <button
                   onClick={onPrevDemoStep}
                   disabled={!['ROUTES_READY', 'ROUTE_RECOMMENDED'].includes(demoPhaseName)}
                   className="px-3 py-1.5 bg-brand-surface border border-brand-border text-gray-400 rounded text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors disabled:opacity-30 flex-1"
                 >
                   ← PREV
                 </button>
                 <button
                   onClick={onNextDemoStep}
                   disabled={demoPhaseName === 'COMPLETED'}
                   className="px-3 py-1.5 bg-brand-surface border border-[#00ff88] text-[#00ff88] rounded text-[10px] uppercase font-bold tracking-widest hover:bg-[#00ff88] hover:text-black transition-colors disabled:opacity-30 flex-1"
                 >
                   NEXT →
                 </button>
               </>
             ) : (
               demoPhaseName !== 'COMPLETED' && (
                 <button
                   onClick={demoActive ? onPauseDemo : onStartDemo}
                   className="px-4 py-1.5 bg-brand-surface border border-[#c084fc] text-[#c084fc] rounded text-[10px] uppercase font-bold tracking-widest hover:bg-[#c084fc] hover:text-black transition-colors flex-1"
                 >
                   {demoActive ? '⏸ PAUSE' : '▶ RESUME'}
                 </button>
               )
             )}
           </div>

           {/* Reset */}
           <button
             onClick={onResetDemo}
             className="px-4 py-1.5 bg-brand-surface border border-brand-red text-brand-red rounded text-[10px] uppercase font-bold tracking-widest hover:bg-brand-red hover:text-black transition-colors"
             title="Reset Environment"
           >
             ↺ RESET
           </button>
        </div>
      </div>
    </div>
  );
}
