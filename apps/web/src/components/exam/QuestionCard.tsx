'use client';

import React from 'react';

interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface QuestionCardProps {
  index: number;
  totalQuestions: number;
  questionText: string;
  options: QuestionOptions;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  onSelect: (option: 'A' | 'B' | 'C' | 'D') => void;
  onPrev: () => void;
  onNext: () => void;
  isSaving?: boolean;
}

const KEYS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

const OPTION_COLOURS: Record<string, { border: string; bg: string; bubble: string; text: string }> = {
  A: { border: '#6366f1', bg: 'rgba(99,102,241,0.08)',  bubble: '#6366f1', text: '#4338ca' },
  B: { border: '#0ea5e9', bg: 'rgba(14,165,233,0.08)',  bubble: '#0ea5e9', text: '#0369a1' },
  C: { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  bubble: '#10b981', text: '#065f46' },
  D: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', bubble: '#f59e0b', text: '#92400e' },
};

export default function QuestionCard({
  index,
  totalQuestions,
  questionText,
  options,
  selectedOption,
  onSelect,
  onPrev,
  onNext,
  isSaving = false,
}: QuestionCardProps) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      border: '1px solid #e2e8f0',
    }}>

      {/* ── Question header ───────────────────────────── */}
      <div style={{
        padding: '16px 24px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Number pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 14px',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            borderRadius: 999,
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          }}>
            Question {index + 1} of {totalQuestions}
          </div>

          {selectedOption && (
            <div style={{
              fontSize: '0.7rem',
              color: '#10b981',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="6" fill="#10b981" />
                <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Answered
            </div>
          )}
        </div>

        {/* Save indicator */}
        {isSaving && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.72rem',
            color: '#6366f1',
          }}>
            <div style={{
              width: 10,
              height: 10,
              border: '2px solid #6366f1',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
            Saving…
          </div>
        )}
      </div>

      {/* ── Question body ─────────────────────────────── */}
      <div style={{ flex: 1, padding: '28px 24px 20px' }}>

        {/* Question text */}
        <p style={{
          fontSize: '1rem',
          lineHeight: 1.75,
          color: '#1e293b',
          fontWeight: 500,
          marginBottom: 28,
          whiteSpace: 'pre-wrap',
        }}>
          {questionText}
        </p>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} role="radiogroup">
          {KEYS.map((key) => {
            const isSelected = selectedOption === key;
            const col = OPTION_COLOURS[key];
            return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? col.border : '#e2e8f0'}`,
                  background: isSelected ? col.bg : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  boxShadow: isSelected ? `0 0 0 3px ${col.border}22` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLLabelElement).style.borderColor = col.border + '80';
                    (e.currentTarget as HTMLLabelElement).style.background = col.bg + '80';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLLabelElement).style.borderColor = '#e2e8f0';
                    (e.currentTarget as HTMLLabelElement).style.background = '#fff';
                  }
                }}
              >
                <input
                  type="radio"
                  name={`q-${index}`}
                  value={key}
                  checked={isSelected}
                  onChange={() => onSelect(key)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />

                {/* Letter bubble */}
                <div style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isSelected ? col.bubble : '#f1f5f9',
                  border: `2px solid ${isSelected ? col.bubble : '#cbd5e1'}`,
                  color: isSelected ? '#fff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 2px 8px ${col.bubble}55` : 'none',
                }}>
                  {key}
                </div>

                {/* Option text */}
                <span style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  color: isSelected ? '#1e293b' : '#475569',
                  fontWeight: isSelected ? 600 : 400,
                  paddingTop: 4,
                  flex: 1,
                  transition: 'all 0.15s ease',
                }}>
                  {options[key]}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Navigation footer ─────────────────────────── */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <button
          onClick={onPrev}
          disabled={index === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderRadius: 10,
            color: '#475569',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            opacity: index === 0 ? 0.4 : 1,
            transition: 'all 0.15s',
          }}
        >
          ← Previous
        </button>

        {selectedOption ? (
          <button
            onClick={() => onSelect(selectedOption)}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              border: '1.5px solid #fca5a5',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: '0.73rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ✕ Clear
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onNext}
          disabled={index === totalQuestions - 1}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            background: index === totalQuestions - 1
              ? '#f1f5f9'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: '1.5px solid transparent',
            borderRadius: 10,
            color: index === totalQuestions - 1 ? '#94a3b8' : '#fff',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: index === totalQuestions - 1 ? 'not-allowed' : 'pointer',
            opacity: index === totalQuestions - 1 ? 0.5 : 1,
            boxShadow: index === totalQuestions - 1 ? 'none' : '0 2px 8px rgba(99,102,241,0.35)',
            transition: 'all 0.15s',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
