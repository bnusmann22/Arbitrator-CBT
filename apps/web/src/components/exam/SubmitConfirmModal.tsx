'use client';

import React from 'react';
import { ClipboardList, TriangleAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubmitConfirmModalProps {
  answeredCount: number;
  totalQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function SubmitConfirmModal({
  answeredCount,
  totalQuestions,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: SubmitConfirmModalProps) {
  const unanswered = totalQuestions - answeredCount;
  const pct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const allAnswered = unanswered === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        animation: 'slideUp 0.2s ease-out',
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <ClipboardList size={36} color="#6366f1" strokeWidth={1.5} />
          </div>
          <h2 id="submit-title" style={{
            fontSize: '1.15rem',
            fontWeight: 800,
            color: '#f1f5f9',
            marginBottom: 4,
          }}>
            Submit Exam?
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
            This action is final and cannot be undone.
          </p>
        </div>

        <div style={{ padding: '24px' }}>

          {/* Progress ring + stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '16px',
            background: '#f8fafc',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
          }}>
            {/* Ring */}
            <div style={{ flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke={allAnswered ? '#10b981' : '#f59e0b'}
                  strokeWidth="5"
                  strokeDasharray={`${(pct / 100) * 163.4} 163.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dasharray 0.4s ease' }}
                />
                <text x="32" y="37" textAnchor="middle" fontSize="13" fontWeight="800" fill="#1e293b">
                  {pct}%
                </text>
              </svg>
            </div>

            {/* Stats */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Answered</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981' }}>{answeredCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Unanswered</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: unanswered > 0 ? '#f59e0b' : '#94a3b8' }}>
                  {unanswered}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Total</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{totalQuestions}</span>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          {unanswered > 0 && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: '0.78rem',
              color: '#d97706',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.5,
            }}>
              <TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {unanswered} question{unanswered > 1 ? 's' : ''} left unanswered.
                Unanswered questions count as incorrect.
              </span>
            </div>
          )}

          {allAnswered && (
            <div style={{
              padding: '12px 14px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: '0.78rem',
              color: '#059669',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ display: 'inline-flex' }}
              >
                <CheckCircle2 size={15} color="#059669" />
              </motion.span>
              All questions answered — you&apos;re ready to submit!
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                background: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 12,
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              Continue Exam
            </button>

            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '12px',
                background: isSubmitting
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                borderRadius: 12,
                color: isSubmitting ? '#94a3b8' : '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: 14,
                    height: 14,
                    border: '2px solid #94a3b8',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                  Submitting…
                </>
              ) : (
                'Submit Now'
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
