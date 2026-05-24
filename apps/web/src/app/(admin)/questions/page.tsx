'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import UploadZone, { UploadResult, ParsedQuestionRow } from '@/components/admin/UploadZone';
import DualUploadZone from '@/components/admin/DualUploadZone';
import ManualQuestionForm from '@/components/admin/ManualQuestionForm';
import QuestionPreview from '@/components/admin/QuestionPreview';
import styles from './page.module.css';

// ── Upload Format Guide Modal ─────────────────────────────────────────────────

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload format guide"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close guide"
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: 20,
            cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >✕</button>

        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          📤 Upload Format Guide
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          How to structure your files so the parser reads them correctly.
        </p>

        {/* ── Section 1: Single file upload ── */}
        <Section title="📁 Single File Upload" accent="#6366f1">
          <P>
            Upload <strong>one PDF or DOCX</strong> that contains both the questions and (optionally)
            the answers. The parser detects the most common MCQ layouts automatically.
          </P>

          <SubHeading>Supported question formats</SubHeading>
          <CodeBlock>{`1. What is arbitration?
A. A binding dispute resolution process
B. A form of mediation
C. A court trial
D. None of the above

2. Who appoints the arbitrator?
(A) The plaintiff
(B) The defendant
(C) Both parties by agreement
(D) The presiding judge`}</CodeBlock>

          <SubHeading>Embedding the answer in the file</SubHeading>
          <P>If answers are included, add them after the options using any of these patterns:</P>
          <CodeBlock>{`Answer: C          ← after each question
Ans: C
Correct Answer: C

Answer Key:        ← section at the end
1. A
2. C
3. B`}</CodeBlock>

          <P style={{ marginTop: 8 }}>
            Questions whose answer cannot be detected are flagged <Warn>⚠ Review</Warn> —
            use the dropdown + <Confirm>✓</Confirm> button in the table to set the correct option.
            <strong> Option A is fully selectable</strong> — click ✓ to confirm it even if it is already shown.
          </P>
        </Section>

        {/* ── Section 2: Dual file upload ── */}
        <Section title="🗝 Dual File Upload" accent="#10b981" style={{ marginTop: '1.75rem' }}>
          <P>
            Upload two separate files: a <strong>question file</strong> and a <strong>answer key file</strong>.
            Answers are matched to questions by their number — the question file never needs to contain answers.
          </P>

          <SubHeading>Question file (PDF or DOCX)</SubHeading>
          <P>Same format as single-file upload above. Every question must start with a number.</P>
          <CodeBlock>{`1. What does "ex aequo et bono" mean?
A. According to law
B. According to what is fair and good
C. Without prejudice
D. Under protest

2. Which body administers ICSID arbitration?
A. ICC
B. UNCITRAL
C. World Bank Group
D. WTO`}</CodeBlock>

          <SubHeading>Answer key file — accepted formats &amp; file types</SubHeading>
          <P>The answer key can be a <strong>PDF, DOCX, TXT, or image</strong> (JPG, PNG, BMP, TIFF, GIF, WebP).</P>

          <P><strong>One answer per line (most reliable):</strong></P>
          <CodeBlock>{`1. B
2. C
3. A
4. D`}</CodeBlock>

          <P><strong>Separators — any of these work:</strong></P>
          <CodeBlock>{`1) B     ← parenthesis
2: C     ← colon
3 - A    ← dash
4 D      ← space only`}</CodeBlock>

          <P><strong>Inline on one line:</strong></P>
          <CodeBlock>{`1.B 2.C 3.A 4.D
1-B, 2-C, 3-A, 4-D`}</CodeBlock>

          <P><strong>Table / Markdown format:</strong></P>
          <CodeBlock>{`| 1 | B |
| 2 | C |
| 3 | A |`}</CodeBlock>

          <P><strong>Header lines are ignored automatically:</strong></P>
          <CodeBlock>{`Answer Key:
Answers:
Correct Answers:`}</CodeBlock>

          <SubHeading>Image answer keys (OCR)</SubHeading>
          <P>
            Upload a photo or scan of a printed or handwritten answer sheet.
            The system uses <strong>computer vision (OCR)</strong> to read the numbers and letters.
            For best results: good lighting, clear handwriting, horizontal orientation,
            and answers written as <code>1. B</code> or <code>1) B</code>.
          </P>

          <SubHeading>How matching works</SubHeading>
          <P>
            After parsing both files, the system aligns each answer-key entry to the question with the
            same number. For example, answer key line <code>5. C</code> is matched to question #5.
            Unmatched questions are flagged <Warn>⚠ Review</Warn>.
          </P>
        </Section>

        {/* Close button at bottom */}
        <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 2rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Small helper sub-components ──────────────────────────────────────────────

function Section({
  title, accent, children, style,
}: {
  title: string; accent: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{
      borderLeft: `3px solid ${accent}`,
      paddingLeft: '1rem',
      ...style,
    }}>
      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      color: 'var(--text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginTop: '1rem',
      marginBottom: '0.4rem',
    }}>
      {children}
    </p>
  );
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '0.5rem', ...style }}>
      {children}
    </p>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre style={{
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-primary)',
      overflowX: 'auto',
      lineHeight: 1.7,
      marginBottom: '0.75rem',
      whiteSpace: 'pre',
    }}>
      {children}
    </pre>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: 'var(--accent-warning)',
      background: 'var(--accent-warning-glow)',
      border: '1px solid hsla(38,95%,60%,0.3)',
      borderRadius: 99,
      padding: '1px 7px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function Confirm({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20,
      borderRadius: 4,
      border: '1px solid hsla(152,70%,50%,0.4)',
      background: 'var(--accent-success-glow)',
      color: 'var(--accent-success)',
      fontSize: 11, fontWeight: 700,
      verticalAlign: 'middle',
    }}>
      {children}
    </span>
  );
}

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
  const [showGuide, setShowGuide] = useState(false);

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
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

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

        {/* ── Page footer ──────────────────────────────────────────── */}
        <div style={{
          marginTop: 'var(--space-3xl)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
        }}>
          <button
            onClick={() => setShowGuide(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
              padding: '4px 8px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            ? How do the upload formats work?
          </button>
        </div>
      </main>
    </div>
  );
}
