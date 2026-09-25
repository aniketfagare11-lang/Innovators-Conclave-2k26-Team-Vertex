import React from 'react';

const PHASE_STATUS = {
  idle:       { label: 'SYSTEM STANDBY',    color: '#4a7090', dot: '#4a7090' },
  located:    { label: 'ANALYZING THREAT',  color: '#ffa500', dot: '#ffa500' },
  dispatched: { label: 'DISPATCHING',       color: '#00d4ff', dot: '#00d4ff' },
  enroute:    { label: 'EMERGENCY ACTIVE',  color: '#ff3333', dot: '#ff3333' },
  arrived:    { label: 'UNIT ARRIVED',      color: '#00ff88', dot: '#00ff88' },
};

export default function Header({ phase, currentTime, onMenuToggle }) {
  const status = PHASE_STATUS[phase] || PHASE_STATUS.idle;
  const activeEmergencies = phase !== 'idle' ? 1 : 0;

  return (
    <header className="h-16 flex items-center justify-between px-4 shrink-0 relative z-[100] border-b border-brand-border bg-brand-surface shadow-cyan">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-brand-border bg-brand-card text-brand-muted mr-3 shrink-0 text-xl hover:text-brand-cyan transition-colors"
      >
        ☰
      </button>

      {/* Left: Branding */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-brand-cyan to-blue-600 rounded-lg flex items-center justify-center text-xl shadow-cyan">
          <span className="opacity-90">🌐</span>
        </div>
        <div className="hidden sm:flex flex-col justify-center">
          <div className="font-display text-lg font-bold text-brand-text tracking-widest leading-tight">
            SMART CITY <span className="text-brand-cyan">COMMAND CENTER</span>
          </div>
          <div className="font-mono text-[10px] text-brand-muted tracking-[0.15em] uppercase">
            Urban Traffic & Emergency Response System
          </div>
        </div>
      </div>

      {/* Center: System Status */}
      <div className="hidden xl:flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider text-brand-muted">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_#00ff88]"></div>
          <span className="text-brand-text">System Online</span>
        </div>
        <div className="w-px h-4 bg-brand-border"></div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></div>
          <span className="text-brand-text">Traffic Monitoring (SIMULATION)</span>
        </div>
        <div className="w-px h-4 bg-brand-border"></div>
        <div className="flex items-center gap-2">
          <span className={activeEmergencies > 0 ? "text-brand-red font-bold" : "text-brand-text"}>
            Active Emergencies: {activeEmergencies}
          </span>
        </div>
      </div>

      {/* Right: Phase & Clock */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 bg-brand-card border border-brand-border rounded px-3 py-1.5">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ 
              backgroundColor: status.dot, 
              boxShadow: `0 0 8px ${status.dot}`,
              animation: phase === 'enroute' ? 'pulse 1s ease-in-out infinite' : 'none'
            }} 
          />
          <span className="font-display text-[11px] font-bold tracking-widest" style={{ color: status.color }}>
            {status.label}
          </span>
        </div>

        <div className="text-right flex flex-col justify-center">
          <div className="font-mono text-lg font-bold text-brand-cyan tracking-widest">
            {currentTime}
          </div>
          <div className="hidden sm:block font-mono text-[9px] text-brand-muted tracking-widest uppercase">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>
    </header>
  );
}
