'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import UploadZone, { UploadResult, ParsedQuestionRow } from '@/components/admin/UploadZone';
import DualUploadZone from '@/components/admin/DualUploadZone';
import ManualQuestionForm from '@/components/admin/ManualQuestionForm';
import QuestionPreview from '@/components/admin/QuestionPreview';
import styles from './page.module.css';

interface Exam {
  id: string;
  title: string;
  status: string;
  questionCount: number;
}

type TabId = 'upload' | 'dual' | 'manual';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'upload',  label: 'Upload File',     icon: '📁' },
  { id: 'dual',    label: 'Dual Upload',      icon: '🗝' },
  { id: 'manual',  label: 'Add Manually',     icon: '✏️' },
];

const API = '/api/proxy';

export default function QuestionsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [questions, setQuestions] = useState<ParsedQuestionRow[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    saved: number;
    needsReview: number;
    matched?: number;
    mode?: TabId;
  } | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('upload');

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

  // ── Upload success handler (single file) ────────────────────────────────
  function handleUploadSuccess(result: UploadResult) {
    mergeQuestions(result.questions);
    setUploadResult({ saved: result.saved, needsReview: result.needsReview, mode: 'upload' });
  }

  // ── Dual upload success handler ─────────────────────────────────────────
  function handleDualSuccess(result: UploadResult & { matched: number }) {
    mergeQuestions(result.questions);
    setUploadResult({
      saved: result.saved,
      needsReview: result.needsReview,
      matched: result.matched,
      mode: 'dual',
    });
  }

  // ── Manual question added ───────────────────────────────────────────────
  function handleManualSuccess(question: ParsedQuestionRow) {
    setQuestions((prev) =>
      [...prev, question].sort((a, b) => a.order - b.order),
    );
    setUploadResult({ saved: 1, needsReview: 0, mode: 'manual' });
  }

  // ── Merge newly uploaded questions into the list ────────────────────────
  function mergeQuestions(newOnes: ParsedQuestionRow[]) {
    setQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.id));
      const fresh = newOnes.filter((q) => !existingIds.has(q.id));
      return [...prev, ...fresh].sort((a, b) => a.order - b.order);
    });
  }

  // ── Delete single question ──────────────────────────────────────────────
  function handleDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  // ── Update answer locally after API call ────────────────────────────────
  function handleAnswerChange(id: string, answer: 'A' | 'B' | 'C' | 'D') {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, correctAnswer: answer, needsReview: false } : q,
      ),
    );
  }

  // ── Delete all questions ────────────────────────────────────────────────
  async function handleDeleteAll() {
    if (
      !confirm(
        `Delete ALL ${questions.length} questions from this exam? This cannot be undone.`,
      )
    )
      return;
    setDeletingAll(true);
    try {
      await fetch(`${API}/questions/${selectedExamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setQuestions([]);
      setUploadResult(null);
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
            Add questions by uploading a file, mapping a separate answer key, or entering them manually
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

        {selectedExamId ? (
          <>
            {/* ── Tab selector + content ─────────────────────────────────── */}
            <div className={styles.uploadSection}>

              {/* Tabs */}
              <div className={styles.tabBar}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    className={
                      activeTab === tab.id
                        ? `${styles.tabBtn} ${styles.tabBtnActive}`
                        : styles.tabBtn
                    }
                    onClick={() => { setActiveTab(tab.id); setUploadResult(null); }}
                  >
                    <span className={styles.tabIcon}>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className={styles.tabContent}>
                {activeTab === 'upload' && (
                  <>
                    <p className={styles.tabHint}>
                      Upload a single PDF or DOCX file containing numbered MCQ questions.
                      The parser supports most standard formats — numbered options (A. / A) / (A)),
                      inline options, and embedded or trailing answer lines.
                    </p>
                    <UploadZone examId={selectedExamId} onSuccess={handleUploadSuccess} />
                  </>
                )}

                {activeTab === 'dual' && (
                  <>
                    <p className={styles.tabHint}>
                      Upload your question file and a separate answer key file.
                      The answer key is read using OCR (for images) or text extraction (for PDF/DOCX/TXT),
                      and answers are matched to questions by their number.
                    </p>
                    <DualUploadZone examId={selectedExamId} onSuccess={handleDualSuccess} />
                  </>
                )}

                {activeTab === 'manual' && (
                  <>
                    <p className={styles.tabHint}>
                      Add a single question manually. Fill in the question text, all four options,
                      and select the correct answer. Each submission appends to the existing question list.
                    </p>
                    <ManualQuestionForm
                      examId={selectedExamId}
                      onSuccess={handleManualSuccess}
                    />
                  </>
                )}
              </div>

              {/* Result toast */}
              {uploadResult && (
                <div className={styles.uploadResult}>
                  {uploadResult.mode === 'manual' ? (
                    <>✅ Question added successfully</>
                  ) : uploadResult.mode === 'dual' ? (
                    <>
                      ✅ Parsed {uploadResult.saved} questions
                      {uploadResult.matched != null && (
                        <> — 🗝 {uploadResult.matched} answers matched</>
                      )}
                      {uploadResult.needsReview > 0 && (
                        <> — ⚠ {uploadResult.needsReview} need answer review</>
                      )}
                    </>
                  ) : (
                    <>
                      ✅ Parsed {uploadResult.saved} questions
                      {uploadResult.needsReview > 0 && (
                        <> — ⚠ {uploadResult.needsReview} need answer review</>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Questions table ────────────────────────────────────────── */}
            <div className={styles.questionsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Questions{selectedExam ? ` — ${selectedExam.title}` : ''}
                  <span className={styles.questionCount}>{questions.length}</span>
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
