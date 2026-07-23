import React, { useEffect, useState } from 'react';

const TYPE_STYLES = {
  info:    { border: '#00d4ff', bg: 'rgba(0,212,255,0.08)',  icon: 'ℹ️' },
  success: { border: '#00ff88', bg: 'rgba(0,255,136,0.08)',  icon: '✅' },
  warning: { border: '#ffa500', bg: 'rgba(255,165,0,0.08)',  icon: '⚠️' },
  danger:  { border: '#ff3333', bg: 'rgba(255,51,51,0.08)',  icon: '🚨' },
};

function AlertItem({ alert, onRemove }) {
  const [visible, setVisible] = useState(false);
  const style = TYPE_STYLES[alert.type] || TYPE_STYLES.info;

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto remove after 6s
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(alert.id), 300);
    }, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [alert.id, onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 10px',
      background: style.bg,
      border: `1px solid ${style.border}44`,
      borderLeft: `3px solid ${style.border}`,
      borderRadius: '0 6px 6px 0',
      marginBottom: 4,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      transition: 'all 0.3s ease-out',
      cursor: 'pointer',
    }}
    onClick={() => { setVisible(false); setTimeout(() => onRemove(alert.id), 300); }}
    >
      <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11, color: 'var(--text)',
          lineHeight: 1.3,
        }}>{alert.message}</div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, color: 'var(--muted)',
          marginTop: 2,
        }}>{alert.time}</div>
      </div>
    </div>
  );
}

export default function AlertSystem({ alerts, onRemove }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: 12,
      maxHeight: 220,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 10,
          color: 'var(--muted)', letterSpacing: '0.15em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          SYSTEM ALERTS
          {alerts.length > 0 && (
            <span style={{
              background: '#ff3333', color: '#fff',
              borderRadius: '50%', width: 14, height: 14,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700,
            }}>{Math.min(alerts.length, 9)}</span>
          )}
        </div>
        {alerts.length > 0 && (
          <button
            onClick={() => alerts.forEach(a => onRemove(a.id))}
            style={{
              background: 'none', border: 'none',
              color: 'var(--muted)', fontFamily: 'var(--font-mono)',
              fontSize: 9, cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >CLEAR ALL</button>
        )}
      </div>

      <div style={{ overflow: 'hidden', flex: 1 }}>
        {alerts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '16px 0',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
          }}>No active alerts</div>
        ) : (
          alerts.slice(0, 5).map(alert => (
            <AlertItem key={alert.id} alert={alert} onRemove={onRemove} />
          ))
        )}
      </div>
    </div>
  );
}
