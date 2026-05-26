'use client';

import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import styles from './QuestionPreview.module.css';
import { ParsedQuestionRow } from './UploadZone';

interface QuestionPreviewProps {
  questions: ParsedQuestionRow[];
  examId: string;
  onDelete: (questionId: string) => void;
  onAnswerChange?: (questionId: string, answer: 'A' | 'B' | 'C' | 'D') => void;
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const;

const OPTION_COLOURS: Record<string, string> = {
  A: '#6366f1',
  B: '#0ea5e9',
  C: '#10b981',
  D: '#f59e0b',
};

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
  const [savingId, setSavingId]     = useState<string | null>(null);
  const [savingAnswer, setSavingAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);

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

  /**
   * Save answer — called immediately when an option button is clicked.
   * Highlights the clicked button during the network call via savingAnswer,
   * then clears on completion. Works for all options including A.
   */
  async function saveAnswer(q: ParsedQuestionRow, answer: 'A' | 'B' | 'C' | 'D') {
    setSavingId(q.id);
    setSavingAnswer(answer);
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
    } finally {
      setSavingId(null);
      setSavingAnswer(null);
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
              questions.map((q) => {
                const isSaving = savingId === q.id;

                return (
                  <tr key={q.id}>
                    <td className={styles.numCell}>{q.order}</td>

                    <td className={styles.questionText}>
                      {q.questionText}
                      {q.needsReview && (
                        <span className={styles.reviewBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <TriangleAlert size={11} style={{ flexShrink: 0 }} /> Review
                        </span>
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
                        /*
                         * Review questions: four inline letter buttons — A B C D.
                         * Clicking any button immediately saves that answer.
                         * The active button is highlighted using OPTION_COLOURS.
                         * This works for every option including A, since clicking
                         * always fires the handler regardless of prior state.
                         */
                        <div className={styles.answerCell}>
                          {OPTIONS.map((opt) => {
                            // Highlight the in-flight answer while saving,
                            // or the current saved answer while idle.
                            const isActive = isSaving
                              ? savingAnswer === opt
                              : q.correctAnswer === opt;
                            const colour = OPTION_COLOURS[opt];
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => saveAnswer(q, opt)}
                                disabled={isSaving}
                                aria-label={`Set correct answer to ${opt}`}
                                title={`Mark ${opt} as correct`}
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 6,
                                  border: `2px solid ${isActive ? colour : 'var(--border-primary)'}`,
                                  background: isActive ? `${colour}22` : 'var(--bg-tertiary)',
                                  color: isActive ? colour : 'var(--text-muted)',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: 12,
                                  cursor: isSaving ? 'not-allowed' : 'pointer',
                                  opacity: isSaving && !isActive ? 0.35 : 1,
                                  transition: 'all 0.12s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  boxShadow: isActive ? `0 0 0 3px ${colour}33` : 'none',
                                }}
                              >
                                {opt}
                              </button>
                            );
                          })}
                          {isSaving && <span className={styles.savingDot} style={{ marginLeft: 4 }} />}
                        </div>
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
                );
              })
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <TriangleAlert size={13} style={{ flexShrink: 0 }} /> {reviewCount} need answer review — click the correct letter to save
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
