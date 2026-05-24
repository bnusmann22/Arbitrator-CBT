'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './page.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalExams: number;
  activeExams: number;
  totalCandidates: number;
  avgScore: number | null;
}

interface Exam {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  questionCount: number;
  candidateCount: number;
  createdAt: string;
}

interface CreateExamForm {
  title: string;
  description: string;
  durationMinutes: string;
  totalQuestions: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API = '/api/proxy';

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<CreateExamForm>({
    title: '',
    description: '',
    durationMinutes: '60',
    totalQuestions: '50',
  });

  useEffect(() => {
    Promise.all([
      apiFetch<Stats>('/admin/stats'),
      apiFetch<Exam[]>('/admin/exams'),
    ])
      .then(([s, e]) => {
        setStats(s);
        setExams(Array.isArray(e) ? e : (e as { data?: Exam[] })?.data ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateExam(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      const newExam = await apiFetch<Exam>('/admin/exams', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          durationMinutes: Number(form.durationMinutes),
          totalQuestions: Number(form.totalQuestions),
        }),
      });
      setExams((prev) => [newExam, ...prev]);
      setStats((prev) =>
        prev ? { ...prev, totalExams: prev.totalExams + 1 } : prev,
      );
      setShowModal(false);
      setForm({ title: '', description: '', durationMinutes: '60', totalQuestions: '50' });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create exam.');
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  // ── Exam status transitions ─────────────────────────────────────────────────
  const [statusLoading, setStatusLoading] = useState<string | null>(null); // examId being changed

  async function handleStatusChange(examId: string, newStatus: 'active' | 'draft' | 'completed') {
    setStatusLoading(examId);
    try {
      const updated = await apiFetch<Exam>(`/admin/exams/${examId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setExams((prev) => prev.map((e) => (e.id === examId ? updated : e)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update exam status.');
    } finally {
      setStatusLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminNav />

      <main className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Overview of exams, candidates, and results
          </p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))
          ) : (
            <>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.purple}`}>📋</div>
                <div className={styles.statValue}>{stats?.totalExams ?? 0}</div>
                <div className={styles.statLabel}>Total Exams</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.green}`}>✅</div>
                <div className={styles.statValue}>{stats?.activeExams ?? 0}</div>
                <div className={styles.statLabel}>Active Exams</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.blue}`}>👥</div>
                <div className={styles.statValue}>{stats?.totalCandidates ?? 0}</div>
                <div className={styles.statLabel}>Candidates</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.amber}`}>📊</div>
                <div className={styles.statValue}>
                  {stats?.avgScore != null ? `${stats.avgScore}%` : '—'}
                </div>
                <div className={styles.statLabel}>Avg. Score</div>
              </div>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
          </div>
          <div className={styles.actionsGrid}>
            <button className={styles.actionCard} onClick={() => setShowModal(true)}>
              <span className={styles.actionIcon}>➕</span>
              <span className={styles.actionLabel}>Create Exam</span>
              <span className={styles.actionDesc}>Set up a new MCQ exam</span>
            </button>
            <Link href="/questions" className={styles.actionCard}>
              <span className={styles.actionIcon}>📄</span>
              <span className={styles.actionLabel}>Upload Questions</span>
              <span className={styles.actionDesc}>Import PDF or DOCX</span>
            </Link>
            <Link href="/candidates" className={styles.actionCard}>
              <span className={styles.actionIcon}>👤</span>
              <span className={styles.actionLabel}>Add Candidates</span>
              <span className={styles.actionDesc}>Register exam takers</span>
            </Link>
            <Link href="/results" className={styles.actionCard}>
              <span className={styles.actionIcon}>📈</span>
              <span className={styles.actionLabel}>View Results</span>
              <span className={styles.actionDesc}>Scores and analytics</span>
            </Link>
          </div>
        </div>

        {/* Recent Exams */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Exams</h2>
            <button
              onClick={() => setShowModal(true)}
              className={styles.sectionLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              + New Exam
            </button>
          </div>

          {loading ? (
            <div className={`skeleton ${styles.skeletonCard}`} />
          ) : exams.length === 0 ? (
            <div className={styles.emptyState}>
              No exams yet.{' '}
              <button
                onClick={() => setShowModal(true)}
                style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                Create your first exam →
              </button>
            </div>
          ) : (
            <table className={styles.examTable}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Candidates</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => {
                  const isChanging = statusLoading === exam.id;
                  return (
                    <tr key={exam.id}>
                      <td style={{ fontWeight: 600 }}>{exam.title}</td>
                      <td>
                        <span className={`${styles.examStatus} ${styles[exam.status]}`}>
                          {exam.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {exam.durationMinutes} min
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {exam.questionCount}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {exam.candidateCount}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(exam.createdAt)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {exam.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(exam.id, 'active')}
                            disabled={isChanging}
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: isChanging ? 'not-allowed' : 'pointer',
                              background: '#16a34a',
                              color: '#fff',
                              opacity: isChanging ? 0.6 : 1,
                            }}
                          >
                            {isChanging ? '…' : '▶ Activate'}
                          </button>
                        )}
                        {exam.status === 'active' && (
                          <button
                            onClick={() => {
                              if (confirm('Close this exam? Candidates will no longer be able to start it.')) {
                                void handleStatusChange(exam.id, 'completed');
                              }
                            }}
                            disabled={isChanging}
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: isChanging ? 'not-allowed' : 'pointer',
                              background: '#dc2626',
                              color: '#fff',
                              opacity: isChanging ? 0.6 : 1,
                            }}
                          >
                            {isChanging ? '…' : '⏹ Close'}
                          </button>
                        )}
                        {exam.status === 'completed' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create Exam Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create New Exam</h2>
            <form className={styles.modalForm} onSubmit={handleCreateExam} noValidate>
              <Input
                label="Exam Title"
                type="text"
                placeholder="e.g. Arbitration Law — Module 1"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                disabled={creating}
              />
              <Input
                label="Description (optional)"
                type="text"
                placeholder="Brief description of this exam"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                disabled={creating}
              />
              <div className={styles.formRow}>
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min={5}
                  max={480}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                  required
                  disabled={creating}
                />
                <Input
                  label="Total Questions"
                  type="number"
                  min={1}
                  max={500}
                  value={form.totalQuestions}
                  onChange={(e) => setForm((p) => ({ ...p, totalQuestions: e.target.value }))}
                  required
                  disabled={creating}
                />
              </div>

              {formError && (
                <p style={{ color: 'var(--accent-danger)', fontSize: 'var(--text-sm)' }}>
                  ⚠ {formError}
                </p>
              )}

              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={creating}>
                  Create Exam
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
