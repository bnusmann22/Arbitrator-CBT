'use client';

import { useState } from 'react';
import type { ParsedQuestionRow } from './UploadZone';

interface Props {
  examId: string;
  onSuccess: (question: ParsedQuestionRow) => void;
}

const OPTION_LABELS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

const OPTION_COLOURS: Record<string, string> = {
  A: '#6366f1', // indigo
  B: '#0ea5e9', // sky
  C: '#10b981', // emerald
  D: '#f59e0b', // amber
};

const API = '/api/proxy';

export default function ManualQuestionForm({ examId, onSuccess }: Props) {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function resetForm() {
    setQuestionText('');
    setOptions({ A: '', B: '', C: '', D: '' });
    setCorrectAnswer('A');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (questionText.trim().length < 5) {
      setError('Question text must be at least 5 characters.');
      return;
    }
    for (const key of OPTION_LABELS) {
      if (!options[key].trim()) {
        setError(`Option ${key} cannot be empty.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/questions/manual?examId=${examId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questionText.trim(),
          options: {
            A: options.A.trim(),
            B: options.B.trim(),
            C: options.C.trim(),
            D: options.D.trim(),
          },
          correctAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data?.message)
          ? data.message.join('. ')
          : data?.message ?? 'Failed to save question.';
        setError(msg);
        return;
      }

      setSuccess('Question added successfully!');
      onSuccess(data);
      resetForm();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Question text */}
      <div>
        <label style={labelStyle}>Question Text</label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Enter the question here…"
          rows={3}
          style={{
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            padding: '0.65rem 0.9rem',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-sans)',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
        />
      </div>

      {/* Options */}
      <div>
        <label style={labelStyle}>Answer Options</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {OPTION_LABELS.map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Letter bubble */}
              <div style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: `${OPTION_COLOURS[key]}22`,
                border: `2px solid ${OPTION_COLOURS[key]}`,
                color: OPTION_COLOURS[key],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}>
                {key}
              </div>
              <input
                type="text"
                value={options[key]}
                onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`Option ${key}`}
                style={{
                  flex: 1,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--text-sm)',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = OPTION_COLOURS[key])}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Correct answer selector */}
      <div>
        <label style={labelStyle}>Correct Answer</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {OPTION_LABELS.map((key) => {
            const selected = correctAnswer === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCorrectAnswer(key)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selected ? OPTION_COLOURS[key] : 'var(--border-primary)'}`,
                  background: selected ? `${OPTION_COLOURS[key]}22` : 'var(--bg-secondary)',
                  color: selected ? OPTION_COLOURS[key] : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: selected ? `0 0 0 3px ${OPTION_COLOURS[key]}33` : 'none',
                }}
              >
                {key}
              </button>
            );
          })}
          <span style={{
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}>
            Option <strong style={{ color: OPTION_COLOURS[correctAnswer], marginLeft: 4 }}>{correctAnswer}</strong> is correct
          </span>
        </div>
      </div>

      {/* Error / success messages */}
      {error && (
        <div style={{
          background: 'hsla(0,80%,60%,0.08)',
          border: '1px solid hsla(0,80%,60%,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.9rem',
          color: 'var(--accent-danger)',
          fontSize: 'var(--text-sm)',
        }}>
          ⚠ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: 'var(--accent-success-glow)',
          border: '1px solid hsla(152,70%,50%,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.9rem',
          color: 'var(--accent-success)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
        }}>
          ✅ {success}
        </div>
      )}

      {/* Submit / Reset */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.65rem 1.6rem',
            borderRadius: 'var(--radius-md)',
            background: saving ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
            color: saving ? 'var(--text-muted)' : '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {saving ? 'Saving…' : '+ Add Question'}
        </button>
        <button
          type="button"
          onClick={resetForm}
          disabled={saving}
          style={{
            padding: '0.65rem 1.2rem',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-primary)',
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>
    </form>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 8,
};
