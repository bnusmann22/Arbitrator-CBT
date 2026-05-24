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

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
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

  /**
   * Staged (not-yet-saved) selections for review questions.
   * onChange on the <select> only updates this — no auto-save —
   * so the admin can always press ✓ to confirm even when the
   * dropdown already shows A (the parser's default fallback).
   */
  const [pendingAnswers, setPendingAnswers] = useState<
    Record<string, 'A' | 'B' | 'C' | 'D'>
  >({});

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
   * Explicit save — called ONLY when the admin clicks ✓.
   * This is intentional: onChange alone no longer triggers a save,
   * which means selecting A (the parser default) then clicking ✓
   * will properly persist A even though "nothing changed" in the select.
   */
  async function saveAnswer(q: ParsedQuestionRow, answer: 'A' | 'B' | 'C' | 'D') {
    setSavingId(q.id);
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
      // Clear pending state; parent flips needsReview → false
      setPendingAnswers((prev) => {
        const next = { ...prev };
        delete next[q.id];
        return next;
      });
      onAnswerChange?.(q.id, answer);
    } catch {
      alert('Failed to update answer. Please try again.');
    } finally {
      setSavingId(null);
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
                // The value shown in the select: use staged selection if present,
                // otherwise fall back to the server value.
                const selectValue: 'A' | 'B' | 'C' | 'D' =
                  pendingAnswers[q.id] ?? q.correctAnswer;
                const isSaving = savingId === q.id;

                return (
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
                        /*
                         * Review questions: staged select + explicit ✓ button.
                         *
                         * Why a button instead of auto-save on onChange?
                         * The parser defaults correctAnswer to 'A' when no answer
                         * is detected, so the select initially shows A. The browser
                         * never fires onChange when the user re-selects an already-
                         * selected value, making A unreachable via onChange alone.
                         * The ✓ button saves whatever is currently shown — including A.
                         */
                        <div className={styles.answerCell}>
                          <select
                            value={selectValue}
                            onChange={(e) => {
                              const val = e.target.value as 'A' | 'B' | 'C' | 'D';
                              setPendingAnswers((prev) => ({ ...prev, [q.id]: val }));
                            }}
                            disabled={isSaving}
                            className={styles.answerSelect}
                            aria-label={`Correct answer for question ${q.order}`}
                          >
                            {OPTIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>

                          <button
                            className={styles.confirmBtn}
                            onClick={() => saveAnswer(q, selectValue)}
                            disabled={isSaving}
                            aria-label="Confirm answer"
                            title="Save this answer"
                          >
                            {isSaving ? (
                              <span className={styles.savingDot} />
                            ) : (
                              <CheckIcon />
                            )}
                          </button>
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
                ⚠ {reviewCount} need answer review — select an option and click ✓
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
