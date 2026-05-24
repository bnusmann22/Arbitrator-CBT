'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import api from '@/lib/api';
import styles from './page.module.css';
import { generateResultPdf, type ResultData } from '@/lib/generateResultPdf';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  questionCount: number;
  candidateCount?: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
  score?: number;
  totalAnswered?: number;
  tabSwitchCount: number;
  startedAt?: string;
  submittedAt?: string;
  examCode: string;
}

type SortKey = 'name' | 'score' | 'status' | 'tabSwitchCount';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function scoreColour(score: number): 'high' | 'mid' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

function exportCsv(candidates: Candidate[], examTitle: string) {
  const header = ['Rank', 'Name', 'Email', 'Code', 'Status', 'Score (%)', 'Answered', 'Tab Switches', 'Submitted At'];
  const sorted = [...candidates]
    .filter((c) => c.status === 'submitted')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const rows = candidates.map((c) => {
    const rank = sorted.findIndex((s) => s.id === c.id) + 1;
    return [
      c.status === 'submitted' ? rank || '' : '',
      c.name,
      c.email,
      c.examCode,
      c.status,
      c.score !== undefined && c.score !== null ? c.score : '',
      c.totalAnswered !== undefined ? c.totalAnswered : '',
      c.tabSwitchCount,
      c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${examTitle.replace(/\s+/g, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    registered:    { label: 'Registered',   cls: styles.badge + ' ' + styles.registered,    dot: '○' },
    'in-progress': { label: 'In Progress',  cls: styles.badge + ' ' + styles.inProgress,    dot: '●' },
    submitted:     { label: 'Submitted',    cls: styles.badge + ' ' + styles.submitted,     dot: '✓' },
    disqualified:  { label: 'Disqualified', cls: styles.badge + ' ' + styles.disqualified,  dot: '✕' },
  };
  const cfg = map[status] ?? { label: status, cls: styles.badge + ' ' + styles.registered, dot: '○' };
  return <span className={cfg.cls}>{cfg.dot} {cfg.label}</span>;
}

function ScoreCell({ score, status }: { score?: number; status: string }) {
  if (status === 'disqualified') {
    return <span className={`${styles.scoreValue} ${styles.dq}`}>DQ</span>;
  }
  if (score === undefined || score === null || status === 'registered' || status === 'in-progress') {
    return <span className={`${styles.scoreValue} ${styles.muted}`}>—</span>;
  }
  const col = scoreColour(score);
  return (
    <div className={styles.scoreCell}>
      <span className={`${styles.scoreValue} ${styles[col]}`}>{score}%</span>
      <div className={styles.scoreMiniBar}>
        <div
          className={`${styles.scoreMiniBarFill} ${styles[col]}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function TabSwitchCell({ count }: { count: number }) {
  const cls = count >= 4 ? styles.danger : count >= 2 ? styles.warn : styles.safe;
  const icon = count >= 4 ? '⚠' : count >= 2 ? '⚠' : '';
  return (
    <span className={`${styles.tabCount} ${cls}`}>
      {icon && <span style={{ fontSize: '0.7rem' }}>{icon}</span>}
      {count}
    </span>
  );
}

function RankCell({ index, candidates }: { index: number; candidates: Candidate[] }) {
  // Only rank submitted candidates by score
  const submitted = [...candidates]
    .filter((c) => c.status === 'submitted' && c.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const candidate = candidates[index];
  if (candidate.status !== 'submitted') {
    return <span className={styles.rank}>—</span>;
  }

  const rank = submitted.findIndex((c) => c.id === candidate.id) + 1;
  if (rank === 1) return <span className={styles.medal}>🥇</span>;
  if (rank === 2) return <span className={styles.medal}>🥈</span>;
  if (rank === 3) return <span className={styles.medal}>🥉</span>;
  return <span className={styles.rank}>{rank}</span>;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [exams, setExams]               = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [candidates, setCandidates]     = useState<Candidate[]>([]);
  const [loading, setLoading]           = useState(true);
  const [candLoading, setCandLoading]   = useState(false);
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState<SortKey>('score');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [pdfLoading, setPdfLoading]     = useState<string | null>(null); // candidateId being generated

  // ── Load exams ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = (await api.get('/admin/exams')) as unknown;
        const raw = Array.isArray(data) ? data : ((data as { data?: unknown })?.data ?? []);
        const list = Array.isArray(raw) ? (raw as Exam[]) : [];
        setExams(list);
        if (list.length > 0) setSelectedExam(list[0]);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Load candidates ─────────────────────────────────────────────────────────
  const loadCandidates = useCallback(async (examId: string) => {
    setCandLoading(true);
    try {
      const data = (await api.get(`/candidates?examId=${examId}`)) as unknown;
      const raw = Array.isArray(data) ? data : ((data as { data?: unknown })?.data ?? []);
      setCandidates(Array.isArray(raw) ? (raw as Candidate[]) : []);
    } catch {
      setCandidates([]);
    } finally {
      setCandLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExam) void loadCandidates(selectedExam.id);
  }, [selectedExam, loadCandidates]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const submitted    = candidates.filter((c) => c.status === 'submitted');
  const inProgress   = candidates.filter((c) => c.status === 'in-progress');
  const disqualified = candidates.filter((c) => c.status === 'disqualified');
  const pending      = candidates.filter((c) => c.status === 'registered');

  const avgScore = submitted.length > 0
    ? Math.round(submitted.reduce((s, c) => s + (c.score ?? 0), 0) / submitted.length)
    : null;

  const passCount = submitted.filter((c) => (c.score ?? 0) >= 50).length;
  const failCount = submitted.filter((c) => (c.score ?? 0) < 50).length;

  const total = candidates.length || 1; // avoid /0
  const passPct  = Math.round((passCount / total) * 100);
  const failPct  = Math.round((failCount / total) * 100);
  const dqPct    = Math.round((disqualified.length / total) * 100);
  const pendPct  = Math.max(0, 100 - passPct - failPct - dqPct);

  // ── Filtered & sorted list ───────────────────────────────────────────────────
  const filtered = candidates
    .filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.examCode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'score')         cmp = (a.score ?? -1) - (b.score ?? -1);
      else if (sortBy === 'name')     cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'status')   cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'tabSwitchCount') cmp = a.tabSwitchCount - b.tabSwitchCount;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // ── PDF generation ───────────────────────────────────────────────────────────
  const handleGeneratePdf = useCallback(async (candidateId: string) => {
    setPdfLoading(candidateId);
    try {
      const data = (await api.get(`/admin/results/${candidateId}`)) as ResultData;
      generateResultPdf(data);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to generate result PDF.');
    } finally {
      setPdfLoading(null);
    }
  }, []);

  const toggleSort = (col: SortKey) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortBy === col
      ? <span style={{ opacity: 0.8 }}>{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>
      : <span style={{ opacity: 0.3 }}> ↕</span>;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminNav />
        <main className={styles.page}>
          <div className={styles.spinner}>
            <div className={styles.spinnerDot} />
            Loading exams…
          </div>
        </main>
      </div>
    );
  }

  // ── No exams ─────────────────────────────────────────────────────────────────
  if (exams.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <AdminNav />
        <main className={styles.page}>
          <div className={styles.header}>
            <h1 className={styles.title}>Results</h1>
            <p className={styles.subtitle}>View scores and submission status for each exam.</p>
          </div>
          <div className={styles.noExams}>
            <div className={styles.noExamsIcon}>📋</div>
            <p className={styles.noExamsText}>No exams found. Create an exam first from the dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminNav />

      <main className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Results</h1>
          <p className={styles.subtitle}>Scores, rankings, and submission analytics for each exam.</p>
        </div>

        {/* Exam Selector */}
        <div className={styles.examSelector}>
          <p className={styles.selectorLabel}>Select Exam</p>
          <div className={styles.examPills}>
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                className={`${styles.examPill} ${selectedExam?.id === exam.id ? styles.active : ''}`}
              >
                {exam.title}
                <span className={styles.pillBadge}>{exam.status}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedExam && (
          <>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.gray}`}>👥</div>
                <div className={styles.statValue}>{candidates.length}</div>
                <div className={styles.statLabel}>Total Registered</div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.blue}`}>📤</div>
                <div className={styles.statValueBlue}>{submitted.length}</div>
                <div className={styles.statLabel}>Submitted</div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.green}`}>📊</div>
                <div className={styles.statValueGreen}>
                  {avgScore !== null ? `${avgScore}%` : '—'}
                </div>
                <div className={styles.statLabel}>Average Score</div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.amber}`}>✅</div>
                <div className={styles.statValueAmber}>
                  {submitted.length > 0
                    ? `${Math.round((passCount / submitted.length) * 100)}%`
                    : '—'}
                </div>
                <div className={styles.statLabel}>Pass Rate</div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.red}`}>🚫</div>
                <div className={styles.statValueRed}>{disqualified.length}</div>
                <div className={styles.statLabel}>Disqualified</div>
              </div>
            </div>

            {/* Score Distribution Bar */}
            {candidates.length > 0 && (
              <div className={styles.distributionCard}>
                <p className={styles.distTitle}>Result Distribution</p>
                <div className={styles.distBar}>
                  <div className={`${styles.distSegment} ${styles.pass}`}    style={{ width: `${passPct}%` }} />
                  <div className={`${styles.distSegment} ${styles.fail}`}    style={{ width: `${failPct}%` }} />
                  <div className={`${styles.distSegment} ${styles.dq}`}      style={{ width: `${dqPct}%` }} />
                  <div className={`${styles.distSegment} ${styles.pending}`} style={{ width: `${pendPct}%` }} />
                </div>
                <div className={styles.distLegend}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.pass}`} />
                    Pass ({passCount})
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.fail}`} />
                    Fail ({failCount})
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.dq}`} />
                    Disqualified ({disqualified.length})
                  </span>
                  {(inProgress.length > 0 || pending.length > 0) && (
                    <span className={styles.legendItem}>
                      <span className={`${styles.legendDot} ${styles.pending}`} />
                      Pending ({inProgress.length + pending.length})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Candidate Table */}
            <div className={styles.tableCard}>
              {/* Toolbar */}
              <div className={styles.tableToolbar}>
                <span className={styles.tableTitle}>
                  {selectedExam.title}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8, fontSize: 'var(--text-sm)' }}>
                    ({filtered.length} candidates)
                  </span>
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email or code…"
                  className={styles.searchInput}
                />

                <button
                  onClick={() => void loadCandidates(selectedExam.id)}
                  className={styles.toolbarBtn}
                >
                  🔄 Refresh
                </button>

                {candidates.length > 0 && (
                  <button
                    onClick={() => exportCsv(candidates, selectedExam.title)}
                    className={styles.exportBtn}
                  >
                    ⬇ Export CSV
                  </button>
                )}
              </div>

              {/* Table body */}
              {candLoading ? (
                <div className={styles.spinner}>
                  <div className={styles.spinnerDot} />
                  Loading results…
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>🔍</div>
                  <p className={styles.emptyText}>
                    {search
                      ? 'No candidates match your search.'
                      : 'No candidates registered for this exam yet.'}
                  </p>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th} style={{ width: 48 }}>Rank</th>
                        <th className={styles.thSortable} onClick={() => toggleSort('name')}>
                          Candidate <SortIcon col="name" />
                        </th>
                        <th className={styles.th}>Code</th>
                        <th className={styles.thSortable} onClick={() => toggleSort('status')}>
                          Status <SortIcon col="status" />
                        </th>
                        <th className={styles.thSortable} onClick={() => toggleSort('score')} style={{ minWidth: 100 }}>
                          Score <SortIcon col="score" />
                        </th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Answered</th>
                        <th className={styles.thSortable} style={{ textAlign: 'center' }} onClick={() => toggleSort('tabSwitchCount')}>
                          Tab Sw. <SortIcon col="tabSwitchCount" />
                        </th>
                        <th className={styles.th}>Submitted At</th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Result PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c.id} className={styles.tr}>
                          <td className={styles.td}>
                            <RankCell index={i} candidates={filtered} />
                          </td>
                          <td className={styles.td}>
                            <div className={styles.candidateName}>{c.name}</div>
                            <div className={styles.candidateEmail}>{c.email}</div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.code}>{c.examCode}</span>
                          </td>
                          <td className={styles.td}>
                            <StatusBadge status={c.status} />
                          </td>
                          <td className={styles.td}>
                            <ScoreCell score={c.score} status={c.status} />
                          </td>
                          <td className={styles.td} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {c.totalAnswered !== undefined && c.totalAnswered !== null
                              ? `${c.totalAnswered} / ${selectedExam.questionCount}`
                              : '—'}
                          </td>
                          <td className={styles.td} style={{ textAlign: 'center' }}>
                            <TabSwitchCell count={c.tabSwitchCount} />
                          </td>
                          <td className={styles.td} style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                            {formatDate(c.submittedAt)}
                          </td>
                          <td className={styles.td} style={{ textAlign: 'center' }}>
                            {(c.status === 'submitted' || c.status === 'disqualified') ? (
                              <button
                                onClick={() => void handleGeneratePdf(c.id)}
                                disabled={pdfLoading === c.id}
                                title="Download result PDF"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '5px 11px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  borderRadius: 7,
                                  border: '1px solid hsla(250,90%,65%,0.3)',
                                  cursor: pdfLoading === c.id ? 'not-allowed' : 'pointer',
                                  background: pdfLoading === c.id
                                    ? 'var(--bg-tertiary)'
                                    : 'hsla(250,90%,65%,0.15)',
                                  color: pdfLoading === c.id
                                    ? 'var(--text-muted)'
                                    : 'var(--accent-primary)',
                                  transition: 'all 0.15s',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {pdfLoading === c.id ? (
                                  <>
                                    <span style={{
                                      width: 10, height: 10,
                                      border: '2px solid currentColor',
                                      borderTopColor: 'transparent',
                                      borderRadius: '50%',
                                      display: 'inline-block',
                                      animation: 'spin 0.6s linear infinite',
                                    }} />
                                    Generating…
                                  </>
                                ) : (
                                  <>📄 PDF</>
                                )}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
