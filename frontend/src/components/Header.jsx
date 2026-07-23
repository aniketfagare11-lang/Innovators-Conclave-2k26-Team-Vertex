import React from 'react';

const PHASE_STATUS = {
  idle:       { label: 'STANDBY',    color: '#4a7090', dot: '#4a7090' },
  located:    { label: 'ANALYZING',  color: '#ffa500', dot: '#ffa500' },
  dispatched: { label: 'DISPATCHING',color: '#00d4ff', dot: '#00d4ff' },
  enroute:    { label: 'EN ROUTE',   color: '#00ff88', dot: '#00ff88' },
  arrived:    { label: 'ARRIVED',    color: '#00ff88', dot: '#00ff88' },
};

export default function Header({ phase, currentTime, onMenuToggle }) {
  const status = PHASE_STATUS[phase] || PHASE_STATUS.idle;

  return (
    <header style={{
      height: 56,
      background: 'linear-gradient(90deg, #040c18 0%, #071525 50%, #040c18 100%)',
      borderBottom: '1px solid #0f3060',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px',
      boxShadow: '0 2px 20px rgba(0,212,255,0.08)',
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-[#0f3060] bg-[#071525] text-[#4a7090] mr-2 shrink-0"
        style={{ fontSize: 18 }}
      >☰</button>

      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 34, height: 34, flexShrink: 0,
          background: 'linear-gradient(135deg, #ff3333, #cc0000)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          boxShadow: '0 0 15px rgba(255,51,51,0.4)',
        }}>🚑</div>
        <div className="hidden sm:block">
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15, fontWeight: 800,
            color: '#c8e0f4',
            letterSpacing: '0.12em',
            lineHeight: 1.1,
          }}>
            LIFELINE <span style={{ color: '#00d4ff' }}>AI</span>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8, color: '#4a7090',
            letterSpacing: '0.12em',
          }}>SMART EMERGENCY RESPONSE</div>
        </div>
      </div>

      {/* Center: Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(10,30,53,0.8)',
          border: `1px solid ${status.color}33`,
          borderRadius: 6, padding: '4px 12px',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status.dot,
            boxShadow: `0 0 8px ${status.dot}`,
            animation: phase === 'enroute' ? 'pulse 1s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 10, fontWeight: 600,
            color: status.color,
            letterSpacing: '0.12em',
          }}>{status.label}</span>
        </div>

        <div className="hidden lg:flex" style={{
          gap: 16,
          fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4a7090',
        }}>
          <span>BENGALURU <span style={{ color: '#00d4ff' }}>CITY</span></span>
          <span style={{ color: '#0f3060' }}>|</span>
          <span>DISPATCH <span style={{ color: '#00ff88' }}>ACTIVE</span></span>
        </div>
      </div>

      {/* Right: Clock */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500,
          color: '#00d4ff', letterSpacing: '0.1em',
        }}>
          {currentTime}
        </div>
        <div className="hidden sm:block" style={{
          fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090',
          letterSpacing: '0.08em',
        }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
