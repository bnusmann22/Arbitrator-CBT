'use client';

import React from 'react';
import { Siren, TriangleAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface WarningOverlayProps {
  tabSwitchCount: number;
  maxSwitches?: number;
  onDismiss: () => void;
}

export default function WarningOverlay({
  tabSwitchCount,
  maxSwitches = 5,
  onDismiss,
}: WarningOverlayProps) {
  const remaining  = maxSwitches - tabSwitchCount;
  const isCritical = remaining <= 1;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="warn-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.25s ease-out',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 5,
          background: isCritical
            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
            : 'linear-gradient(90deg, #f59e0b, #d97706)',
        }} />

        <div style={{ padding: '32px 28px 28px', textAlign: 'center' }}>

          {/* Icon ring */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `2px solid ${isCritical ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 20px',
          }}>
            {isCritical ? (
              <motion.span
                style={{ display: 'inline-flex' }}
                animate={{ opacity: [1, 0.45, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Siren size={34} color="#ef4444" />
              </motion.span>
            ) : (
              <motion.span
                style={{ display: 'inline-flex' }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <TriangleAlert size={34} color="#d97706" />
              </motion.span>
            )}
          </div>

          <h2 id="warn-title" style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: 8,
          }}>
            Tab Switch Detected
          </h2>

          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
            You switched tabs or left the exam window.
            This action is recorded and monitored.
          </p>

          {/* Switch counter pills */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 20,
          }}>
            {Array.from({ length: maxSwitches }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 32,
                  height: 8,
                  borderRadius: 999,
                  background: i < tabSwitchCount
                    ? (isCritical ? '#ef4444' : '#f59e0b')
                    : '#e2e8f0',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>

          {/* Warning message */}
          <div style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: isCritical ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
            border: `1px solid ${isCritical ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
            marginBottom: 24,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: isCritical ? '#dc2626' : '#d97706',
            lineHeight: 1.5,
          }}>
            {remaining > 0 ? (
              isCritical
                ? 'One more switch will disqualify you from this exam!'
                : `You have ${remaining} switch${remaining === 1 ? '' : 'es'} remaining before disqualification.`
            ) : (
              'You have been disqualified. Your exam is being submitted.'
            )}
          </div>

          {/* Dismiss button */}
          <button
            autoFocus
            onClick={onDismiss}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              background: isCritical
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: isCritical
                ? '0 4px 16px rgba(239,68,68,0.35)'
                : '0 4px 16px rgba(245,158,11,0.35)',
              transition: 'opacity 0.15s',
            }}
          >
            I understand — return to exam
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
