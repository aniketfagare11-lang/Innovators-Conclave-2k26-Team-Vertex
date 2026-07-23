import React from 'react';

/**
 * DispatchTimeline
 * Shows a vertical timeline of the 5 fixed dispatch milestones.
 * Each step has: icon, label, timestamp (when done), and visual state.
 *
 * Props:
 *   steps  – array of { key, icon, label, time, done, active }
 *   phase  – current app phase (idle | located | enroute | arrived)
 */
export default function DispatchTimeline({ steps = [], phase }) {
  if (!steps || steps.length === 0 || phase === 'idle') return null;

  return (
    <div
      className="card"
      style={{
        padding: '12px 14px',
        background: 'var(--bg-card, #0f1a2e)',
        borderRadius: 10,
        border: '1px solid var(--color-border, #1e3a5f)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>⏱️</span>
        <span
          style={{
            fontFamily: 'var(--font-display, monospace)',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: 'var(--color-accent-primary, #4fc3f7)',
            textTransform: 'uppercase',
          }}
        >
          DISPATCH TIMELINE
        </span>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Left column: icon + connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                {/* Step circle */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                    background: step.done
                      ? 'rgba(34,197,94,0.18)'
                      : step.active
                        ? 'rgba(79,195,247,0.18)'
                        : 'rgba(255,255,255,0.05)',
                    border: step.done
                      ? '1.5px solid #22c55e'
                      : step.active
                        ? '1.5px solid #4fc3f7'
                        : '1.5px solid rgba(255,255,255,0.12)',
                    boxShadow: step.active ? '0 0 8px rgba(79,195,247,0.4)' : 'none',
                  }}
                >
                  {step.done ? '✓' : step.icon}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 16,
                      background: step.done
                        ? 'rgba(34,197,94,0.5)'
                        : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.4s ease',
                      margin: '2px 0',
                    }}
                  />
                )}
              </div>

              {/* Right column: label + time */}
              <div style={{ paddingTop: 4, paddingBottom: isLast ? 0 : 14, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: step.done || step.active ? 600 : 400,
                    color: step.done
                      ? '#22c55e'
                      : step.active
                        ? '#4fc3f7'
                        : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.3s ease',
                    lineHeight: 1.2,
                  }}
                >
                  {step.label}
                </div>
                {step.time && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.35)',
                      marginTop: 2,
                      fontFamily: 'monospace',
                    }}
                  >
                    {step.time}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
