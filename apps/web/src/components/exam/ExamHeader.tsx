'use client';

import React from 'react';

interface ExamHeaderProps {
  examTitle?: string;
  timeFormatted: string;
  secondsLeft: number;
  answeredCount: number;
  totalQuestions: number;
  tabSwitchCount: number;
  onSubmit: () => void;
}

const MAX_SWITCHES = 5;

export default function ExamHeader({
  examTitle,
  timeFormatted,
  secondsLeft,
  answeredCount,
  totalQuestions,
  tabSwitchCount,
  onSubmit,
}: ExamHeaderProps) {
  const progressPct = totalQuestions > 0
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  const timerCritical = secondsLeft <= 60;
  const timerWarning  = secondsLeft <= 300 && !timerCritical;

  const timerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '1.35rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    tabularNums: true,
    color: timerCritical
      ? '#ef4444'
      : timerWarning
      ? '#f59e0b'
      : '#10b981',
    animation: timerCritical ? 'pulse 1s infinite' : 'none',
  } as React.CSSProperties;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: '#0f172a',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Main bar */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>

        {/* Exam label + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Exam in Progress
          </div>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {examTitle ?? 'Arbitration Sandbox'}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>{answeredCount}</span>
            <span style={{ color: '#475569' }}> / {totalQuestions}</span>
          </div>
          <div style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            answered
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />

        {/* Tab switch badge */}
        {tabSwitchCount > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 700,
            background: tabSwitchCount >= MAX_SWITCHES - 1
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(245,158,11,0.12)',
            color: tabSwitchCount >= MAX_SWITCHES - 1
              ? '#f87171'
              : '#fbbf24',
            border: `1px solid ${
              tabSwitchCount >= MAX_SWITCHES - 1
                ? 'rgba(239,68,68,0.3)'
                : 'rgba(245,158,11,0.25)'
            }`,
          }}>
            <span>⚠</span>
            {tabSwitchCount} / {MAX_SWITCHES} switches
          </div>
        )}

        {/* Timer */}
        <div style={timerStyle}>
          {timeFormatted}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />

        {/* Submit button */}
        <button
          onClick={onSubmit}
          style={{
            padding: '8px 20px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            transition: 'opacity 0.15s, transform 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }}
        >
          Submit Exam
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
        <div
          style={{
            height: '100%',
            width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #6366f1, #10b981)',
            transition: 'width 0.5s ease',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    </header>
  );
}
