'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import UploadZone, { UploadResult, ParsedQuestionRow } from '@/components/admin/UploadZone';
import QuestionPreview from '@/components/admin/QuestionPreview';
import styles from './page.module.css';

interface Exam {
  id: string;
  title: string;
  status: string;
  questionCount: number;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

export default function QuestionsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [questions, setQuestions] = useState<ParsedQuestionRow[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ saved: number; needsReview: number } | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // ── Load exams ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/admin/exams`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: unknown) => {
        const raw = (data as { data?: unknown })?.data ?? data;
        const list: Exam[] = Array.isArray(raw) ? raw : [];
        setExams(list);
        if (list.length > 0) setSelectedExamId(list[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingExams(false));
  }, []);

  // ── Load questions when exam changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedExamId) return;
    setLoadingQuestions(true);
    setUploadResult(null);

    fetch(`${API}/questions?examId=${selectedExamId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: unknown) => {
        const raw = (data as { data?: unknown })?.data ?? data;
        setQuestions(Array.isArray(raw) ? raw : []);
      })
      .catch(console.error)
      .finally(() => setLoadingQuestions(false));
  }, [selectedExamId]);

  // ── Upload success handler ──────────────────────────────────────────────
  function handleUploadSuccess(result: UploadResult) {
    setQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const newOnes = result.questions.filter((q) => !existingIds.has(q.id));
      return [...prev, ...newOnes].sort((a, b) => a.order - b.order);
    });
    setUploadResult({ saved: result.saved, needsReview: result.needsReview });
  }

  // ── Delete single question ──────────────────────────────────────────────
  function handleDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  // ── Update answer locally after API call ────────────────────────────────
  function handleAnswerChange(id: string, answer: 'A' | 'B' | 'C' | 'D') {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, correctAnswer: answer, needsReview: false } : q)),
    );
  }

  // ── Delete all questions ────────────────────────────────────────────────
  async function handleDeleteAll() {
    if (!confirm(`Delete ALL ${questions.length} questions from this exam? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      await fetch(`${API}/questions/${selectedExamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setQuestions([]);
    } catch {
      alert('Failed to delete questions.');
    } finally {
      setDeletingAll(false);
    }
  }

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminNav />

      <main className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Question Management</h1>
          <p className={styles.subtitle}>
            Upload PDF or DOCX files to auto-parse MCQ questions
          </p>
        </div>

        {/* Exam selector */}
        <div className={styles.controls}>
          <div className={styles.selectWrapper}>
            <label className={styles.selectLabel}>Select Exam</label>
            {loadingExams ? (
              <div className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-md)' }} />
            ) : (
              <select
                className={styles.select}
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                {exams.length === 0 ? (
                  <option value="">No exams yet — create one on the dashboard</option>
                ) : (
                  exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.questionCount} questions)
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>

        {/* Upload zone */}
        {selectedExamId ? (
          <>
            <div className={styles.uploadSection}>
              <h2 className={styles.sectionTitle}>Upload Questions</h2>
              <UploadZone
                examId={selectedExamId}
                onSuccess={handleUploadSuccess}
              />
              {uploadResult && (
                <div className={styles.uploadResult}>
                  ✅ Parsed {uploadResult.saved} questions
                  {uploadResult.needsReview > 0 && (
                    <> — ⚠ {uploadResult.needsReview} need answer review</>
                  )}
                </div>
              )}
            </div>

            {/* Questions table */}
            <div className={styles.questionsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Questions {selectedExam && `— ${selectedExam.title}`}
                </h2>
                {questions.length > 0 && (
                  <button
                    className={styles.deleteAllBtn}
                    onClick={handleDeleteAll}
                    disabled={deletingAll}
                  >
                    {deletingAll ? 'Deleting…' : `Delete all (${questions.length})`}
                  </button>
                )}
              </div>

              {loadingQuestions ? (
                <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
              ) : (
                <QuestionPreview
                  questions={questions}
                  examId={selectedExamId}
                  onDelete={handleDelete}
                  onAnswerChange={handleAnswerChange}
                />
              )}
            </div>
          </>
        ) : (
          <div className={styles.noExamHint}>
            👆 Select an exam above, or{' '}
            <a href="/dashboard" style={{ color: 'var(--accent-primary)' }}>
              create one on the dashboard
            </a>{' '}
            to get started.
          </div>
        )}
      </main>
    </div>
  );
}
