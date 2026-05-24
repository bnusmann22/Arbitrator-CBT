'use client';

import { useState } from 'react';
import styles from './QuestionPreview.module.css';
import { ParsedQuestionRow } from './UploadZone';

interface QuestionPreviewProps {
  questions: ParsedQuestionRow[];
  examId: string;
  onDelete: (questionId: string) => void;
  onAnswerChange?: (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => void;
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const;

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

export default function QuestionPreview({
  questions,
  examId,
  onDelete,
  onAnswerChange,
}: QuestionPreviewProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(q: ParsedQuestionRow) {
    if (!confirm(`Delete question #${q.order}? This cannot be undone.`)) return;

    setDeletingId(q.id);
    try {
      await fetch(
        `/api/proxy/questions/${examId}/${q.id}`,
        { method: 'DELETE', credentials: 'include' },
      );
      onDelete(q.id);
    } catch {
      alert('Failed to delete question. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAnswerChange(
    q: ParsedQuestionRow,
    answer: 'A' | 'B' | 'C' | 'D',
  ) {
    try {
      await fetch(
        `/api/proxy/questions/${examId}/${q.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctAnswer: answer }),
        },
      );
      onAnswerChange?.(q.id, answer);
    } catch {
      alert('Failed to update answer. Please try again.');
    }
  }

  const reviewCount = questions.filter((q) => q.needsReview).length;

  return (
    <div>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.numCell}>#</th>
              <th>Question</th>
              <th>Options</th>
              <th className={styles.answer}>Answer</th>
              <th className={styles.actions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No questions yet. Upload a PDF or DOCX file above.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id}>
                  <td className={styles.numCell}>{q.order}</td>

                  <td className={styles.questionText}>
                    {q.questionText}
                    {q.needsReview && (
                      <span className={styles.reviewBadge}>⚠ Review</span>
                    )}
                  </td>

                  <td className={styles.options}>
                    {OPTIONS.map((key) => (
                      <div key={key} className={styles.optionRow}>
                        <span className={styles.optionKey}>{key}.</span>
                        <span className={styles.optionValue}>{q.options[key]}</span>
                      </div>
                    ))}
                  </td>

                  <td className={styles.answer}>
                    {q.needsReview ? (
                      /* Inline answer selector for questions needing review */
                      <select
                        value={q.correctAnswer}
                        onChange={(e) =>
                          handleAnswerChange(q, e.target.value as 'A' | 'B' | 'C' | 'D')
                        }
                        style={{
                          background: 'var(--bg-tertiary)',
                          color: 'var(--accent-warning)',
                          border: '1px solid hsla(38,95%,60%,0.4)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 8px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {OPTIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.answerBadge}>{q.correctAnswer}</span>
                    )}
                  </td>

                  <td className={styles.actions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(q)}
                      disabled={deletingId === q.id}
                      aria-label="Delete question"
                      title="Delete question"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {questions.length > 0 && (
          <div className={styles.summary}>
            <span>
              <span className={styles.summaryCount}>{questions.length}</span> questions
            </span>
            {reviewCount > 0 && (
              <span className={styles.reviewCount}>
                ⚠ {reviewCount} need answer review
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
