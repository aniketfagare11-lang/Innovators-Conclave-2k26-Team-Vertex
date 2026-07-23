import React, { useEffect, useRef, useState } from 'react';

/**
 * Plays a looping SOS siren using the Web Audio API.
 * Returns a stop function.
 */
function createSiren() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let stopped = false;

  function beep(freq, startTime, duration) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.05);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function scheduleCycle(offset) {
    if (stopped) return;
    // High-low siren pattern
    beep(880, ctx.currentTime + offset,       0.4);
    beep(660, ctx.currentTime + offset + 0.4, 0.4);
    beep(880, ctx.currentTime + offset + 0.8, 0.4);
    beep(660, ctx.currentTime + offset + 1.2, 0.4);
    // Schedule next cycle
    setTimeout(() => scheduleCycle(0), (offset + 1.6) * 1000);
  }

  scheduleCycle(0);

  return () => {
    stopped = true;
    try { ctx.close(); } catch (_) {}
  };
}

const CANCEL_WINDOW = 60; // seconds

export default function SOSOverlay({ visible, onCancel, onConfirm }) {
  const [countdown, setCountdown] = useState(CANCEL_WINDOW);
  const stopSirenRef = useRef(null);
  const timerRef     = useRef(null);

  useEffect(() => {
    if (!visible) return;

    // Start siren
    try {
      stopSirenRef.current = createSiren();
    } catch (_) {
      // AudioContext blocked — silently skip
    }

    // Countdown
    setCountdown(CANCEL_WINDOW);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopSirenRef.current?.();
      clearInterval(timerRef.current);
    };
  }, [visible]);

  const handleCancel = () => {
    stopSirenRef.current?.();
    clearInterval(timerRef.current);
    onCancel();
  };

  const handleConfirm = () => {
    stopSirenRef.current?.();
    clearInterval(timerRef.current);
    onConfirm();
  };

  if (!visible) return null;

  const pct = (countdown / CANCEL_WINDOW) * 100;
  const canCancel = countdown > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(4,4,12,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{
        background: '#040c18',
        border: '2px solid #ff3333',
        borderRadius: 16,
        padding: '32px 28px',
        maxWidth: 360,
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 0 60px rgba(255,51,51,0.4), 0 0 120px rgba(255,51,51,0.15)',
        animation: 'sosPulse 1s ease-in-out infinite alternate',
      }}>
        {/* SOS icon */}
        <div style={{
          fontSize: 52, marginBottom: 8,
          animation: 'pulse 0.8s ease-in-out infinite',
        }}>🚨</div>

        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22, fontWeight: 900,
          color: '#ff3333', letterSpacing: '0.2em',
          marginBottom: 6,
          textShadow: '0 0 20px rgba(255,51,51,0.8)',
        }}>SOS ACTIVATED</div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11, color: '#ff9999',
          marginBottom: 20, lineHeight: 1.6,
        }}>
          Emergency services are being dispatched<br />
          to your live location.
        </div>

        {/* Countdown ring */}
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
          <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#1e3a5f" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={canCancel ? '#ffa500' : '#ff3333'}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, fontWeight: 700,
              color: canCancel ? '#ffa500' : '#ff3333',
            }}>{countdown}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#4a7090' }}>SEC</span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {canCancel && (
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 10,
                border: '1px solid #ffa50066',
                background: 'rgba(255,165,0,0.12)',
                color: '#ffa500',
                fontFamily: 'var(--font-display)',
                fontSize: 12, fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,165,0,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,165,0,0.12)'}
            >
              ✕ CANCEL SOS
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 10,
              border: '1px solid #ff333366',
              background: 'rgba(255,51,51,0.18)',
              color: '#ff6666',
              fontFamily: 'var(--font-display)',
              fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,51,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,51,51,0.18)'}
          >
            🚑 CONFIRM
          </button>
        </div>

        {canCancel && (
          <div style={{
            marginTop: 14,
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: '#4a7090', lineHeight: 1.5,
          }}>
            Cancel window closes in {countdown}s.<br />
            After that, dispatch cannot be stopped.
          </div>
        )}
        {!canCancel && (
          <div style={{
            marginTop: 14,
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: '#ff6666',
          }}>
            Cancel window expired — dispatch in progress.
          </div>
        )}
      </div>

      <style>{`
        @keyframes sosPulse {
          from { box-shadow: 0 0 40px rgba(255,51,51,0.3), 0 0 80px rgba(255,51,51,0.1); }
          to   { box-shadow: 0 0 70px rgba(255,51,51,0.6), 0 0 140px rgba(255,51,51,0.25); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
