'use client';

import React from 'react';

export type QuestionNavStatus =
  | 'not-visited'
  | 'answered'
  | 'current'
  | 'not-answered';

interface QuestionNavItem {
  index: number;
  status: QuestionNavStatus;
}

interface QuestionNavProps {
  items: QuestionNavItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

const BUTTON_STYLE: Record<QuestionNavStatus, React.CSSProperties> = {
  current: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.35)',
    fontWeight: 800,
    border: '2px solid #6366f1',
  },
  answered: {
    background: '#10b981',
    color: '#fff',
    border: '2px solid #059669',
    boxShadow: '0 1px 4px rgba(16,185,129,0.3)',
    fontWeight: 700,
  },
  'not-answered': {
    background: 'rgba(245,158,11,0.12)',
    color: '#d97706',
    border: '2px solid rgba(245,158,11,0.5)',
    fontWeight: 600,
  },
  'not-visited': {
    background: '#f8fafc',
    color: '#94a3b8',
    border: '1.5px solid #e2e8f0',
    fontWeight: 500,
  },
};

export default function QuestionNav({ items, currentIndex, onNavigate }: QuestionNavProps) {
  const answeredCount    = items.filter((i) => i.status === 'answered').length;
  const skippedCount     = items.filter((i) => i.status === 'not-answered').length;
  const notVisitedCount  = items.filter((i) => i.status === 'not-visited').length;
  const total            = items.length;
  const pct              = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  return (
    <aside style={{ width: 200, flexShrink: 0 }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 80,
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Questions
          </div>

          {/* Circular progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="#10b981" strokeWidth="3"
                strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e293b">
                {pct}%
              </text>
            </svg>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                {answeredCount}<span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>/{total}</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>answered</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { color: '#10b981', label: `Answered (${answeredCount})` },
            { color: '#f59e0b', label: `Skipped (${skippedCount})`, border: true },
            { color: '#94a3b8', label: `Not visited (${notVisitedCount})`, light: true },
          ].map(({ color, label, border, light }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.67rem', color: '#64748b' }}>
              <div style={{
                width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                background: light ? '#f8fafc' : color,
                border: `1.5px solid ${border ? color + '80' : light ? '#e2e8f0' : color}`,
              }} />
              {label}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.67rem', color: '#64748b' }}>
            <div style={{
              width: 10, height: 10, borderRadius: 3, flexShrink: 0,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            }} />
            Current
          </div>
        </div>

        {/* Number grid */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {items.map((item) => (
            <button
              key={item.index}
              onClick={() => onNavigate(item.index)}
              title={`Question ${item.index + 1} — ${item.status.replace(/-/g, ' ')}`}
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...BUTTON_STYLE[item.status],
              }}
            >
              {item.index + 1}
            </button>
          ))}
        </div>

        {/* Summary footer */}
        {skippedCount > 0 && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid #fef3c7',
            background: 'rgba(245,158,11,0.05)',
            fontSize: '0.68rem',
            color: '#d97706',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <span>⚠</span>
            {skippedCount} question{skippedCount > 1 ? 's' : ''} skipped
          </div>
        )}
      </div>
    </aside>
  );
}
