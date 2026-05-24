'use client';

import { useEffect, useState, FormEvent } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import CandidateTable, { CandidateRow } from '@/components/admin/CandidateTable';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

interface Exam {
  id: string;
  title: string;
  candidateCount: number;
}

const API = process.env.NEXT_PUBLIC_API_URL!;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message?.[0] ?? json?.message ?? 'Request failed');
  // Unwrap TransformInterceptor envelope { success, data, timestamp } if present
  if (json !== null && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// ── Parse CSV / newline text for bulk input ───────────────────────────────────
// Expected format: "Name, email@example.com" one per line
function parseBulkText(text: string): { name: string; email: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && line.includes(','))
    .map((line) => {
      const commaIdx = line.indexOf(',');
      return {
        name: line.slice(0, commaIdx).trim(),
        email: line.slice(commaIdx + 1).trim(),
      };
    })
    .filter((c) => c.name && c.email);
}

export default function CandidatesPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single form state
  const [singleForm, setSingleForm] = useState({ name: '', email: '' });
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleMsg, setSingleMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk form state
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load exams
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

  // Load candidates when exam changes
  useEffect(() => {
    if (!selectedExamId) return;
    setLoadingCandidates(true);
    fetch(`${API}/candidates?examId=${selectedExamId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data: unknown) => {
        const raw = (data as { data?: unknown })?.data ?? data;
        setCandidates(Array.isArray(raw) ? raw : []);
      })
      .catch(console.error)
      .finally(() => setLoadingCandidates(false));
  }, [selectedExamId]);

  // ── Single add ──────────────────────────────────────────────────────────
  async function handleSingleSubmit(e: FormEvent) {
    e.preventDefault();
    setSingleMsg(null);
    setSingleLoading(true);

    try {
      const candidate = await apiFetch<CandidateRow>('/candidates', {
        method: 'POST',
        body: JSON.stringify({ ...singleForm, examId: selectedExamId }),
      });
      setCandidates((prev) => [candidate, ...prev]);
      setSingleForm({ name: '', email: '' });
      setSingleMsg({ type: 'success', text: `✅ ${candidate.name} added — code: ${candidate.examCode}` });
    } catch (err: unknown) {
      setSingleMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to add candidate.',
      });
    } finally {
      setSingleLoading(false);
    }
  }

  // ── Bulk add ────────────────────────────────────────────────────────────
  async function handleBulkSubmit(e: FormEvent) {
    e.preventDefault();
    setBulkMsg(null);

    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      setBulkMsg({ type: 'error', text: 'No valid rows found. Use format: Name, email@example.com' });
      return;
    }

    setBulkLoading(true);
    try {
      const result = await apiFetch<{ created: number; skipped: number; candidates: CandidateRow[] }>(
        '/candidates/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ candidates: parsed, examId: selectedExamId }),
        },
      );
      const added = Array.isArray(result.candidates) ? result.candidates : [];
      setCandidates((prev) => [...added, ...prev]);
      setBulkText('');
      setBulkMsg({
        type: 'success',
        text: `✅ ${result.created} added${result.skipped > 0 ? `, ${result.skipped} skipped (duplicates)` : ''}`,
      });
    } catch (err: unknown) {
      setBulkMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Bulk add failed.',
      });
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminNav />

      <main className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Candidates</h1>
          <p className={styles.subtitle}>
            Add candidates and distribute their unique exam codes
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
                  <option value="">No exams — create one on the dashboard</option>
                ) : (
                  exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.candidateCount} candidates)
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
        </div>

        {selectedExamId ? (
          <div className={styles.layout}>
            {/* ── Add Candidate Panel ── */}
            <div className={styles.addPanel}>
              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'single' ? styles.active : ''}`}
                  onClick={() => setActiveTab('single')}
                >
                  Single
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'bulk' ? styles.active : ''}`}
                  onClick={() => setActiveTab('bulk')}
                >
                  Bulk Import
                </button>
              </div>

              {activeTab === 'single' ? (
                <form className={styles.form} onSubmit={handleSingleSubmit} noValidate>
                  <p className={styles.panelTitle}>Add Candidate</p>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Jane Smith"
                    value={singleForm.name}
                    onChange={(e) => setSingleForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    disabled={singleLoading}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="jane@example.com"
                    value={singleForm.email}
                    onChange={(e) => setSingleForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    disabled={singleLoading}
                  />

                  {singleMsg && (
                    <p className={singleMsg.type === 'success' ? styles.successMsg : styles.errorMsg}>
                      {singleMsg.text}
                    </p>
                  )}

                  <Button type="submit" variant="primary" fullWidth isLoading={singleLoading}>
                    Add Candidate
                  </Button>
                </form>
              ) : (
                <form className={styles.form} onSubmit={handleBulkSubmit} noValidate>
                  <p className={styles.panelTitle}>Bulk Import</p>
                  <p className={styles.bulkHint}>
                    One candidate per line in the format:<br />
                    <strong>Full Name, email@example.com</strong>
                  </p>
                  <textarea
                    className={styles.textarea}
                    placeholder={`Jane Smith, jane@example.com\nJohn Doe, john@example.com\nFatima Ali, fatima@example.com`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    disabled={bulkLoading}
                    spellCheck={false}
                  />

                  {bulkMsg && (
                    <p className={bulkMsg.type === 'success' ? styles.successMsg : styles.errorMsg}>
                      {bulkMsg.text}
                    </p>
                  )}

                  <Button type="submit" variant="primary" fullWidth isLoading={bulkLoading}>
                    Import {parseBulkText(bulkText).length > 0
                      ? `${parseBulkText(bulkText).length} Candidates`
                      : 'Candidates'}
                  </Button>
                </form>
              )}
            </div>

            {/* ── Candidate Table ── */}
            <div className={styles.tableSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  {selectedExam?.title ?? 'Candidates'}
                  {candidates.length > 0 && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--text-base)', marginLeft: 8 }}>
                      ({candidates.length})
                    </span>
                  )}
                </h2>
              </div>

              {loadingCandidates ? (
                <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-xl)' }} />
              ) : (
                <CandidateTable candidates={candidates} onDelete={handleDelete} />
              )}
            </div>
          </div>
        ) : (
          <div className={styles.noExamHint}>
            👆 Select an exam above to manage its candidates.
          </div>
        )}
      </main>
    </div>
  );
}
