'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/admin/AdminNav';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Exam {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
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

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  registered:    { label: 'Registered',    cls: 'bg-gray-100 text-gray-600' },
  'in-progress': { label: 'In Progress',   cls: 'bg-blue-100 text-blue-700' },
  submitted:     { label: 'Submitted',     cls: 'bg-emerald-100 text-emerald-700' },
  disqualified:  { label: 'Disqualified',  cls: 'bg-red-100 text-red-700' },
};

function ScoreBadge({ score, status }: { score?: number; status: string }) {
  if (status === 'disqualified') {
    return <span className="text-sm font-medium text-red-600">DQ</span>;
  }
  if (score === undefined || score === null || status === 'registered' || status === 'in-progress') {
    return <span className="text-sm text-gray-400">—</span>;
  }
  const colour =
    score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  return <span className={`text-sm font-bold ${colour}`}>{score}%</span>;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [exams, setExams]           = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [candLoading, setCandLoading] = useState(false);
  const [search, setSearch]         = useState('');
  const [sortBy, setSortBy]         = useState<'name' | 'score' | 'status'>('score');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');

  // ── Load exams ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = (await api.get('/admin/exams')) as Exam[];
        setExams(data);
        if (data.length > 0) setSelectedExam(data[0]);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Load candidates for selected exam ─────────────────────────────────────
  const loadCandidates = useCallback(async (examId: string) => {
    setCandLoading(true);
    try {
      const data = (await api.get(`/candidates?examId=${examId}`)) as Candidate[];
      setCandidates(data);
    } catch {
      setCandidates([]);
    } finally {
      setCandLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExam) void loadCandidates(selectedExam.id);
  }, [selectedExam, loadCandidates]);

  // ── Derived ────────────────────────────────────────────────────────────────
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
      if (sortBy === 'score') {
        cmp = (a.score ?? -1) - (b.score ?? -1);
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const submitted = candidates.filter((c) => c.status === 'submitted');
  const avgScore =
    submitted.length > 0
      ? Math.round(submitted.reduce((s, c) => s + (c.score ?? 0), 0) / submitted.length)
      : null;
  const passCount = submitted.filter((c) => (c.score ?? 0) >= 50).length;
  const dqCount = candidates.filter((c) => c.status === 'disqualified').length;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? (sortDir === 'desc' ? <span> ↓</span> : <span> ↑</span>)
      : <span className="text-gray-300"> ↕</span>;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav />

      <main className="flex-1 px-8 py-8 max-w-6xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Results</h1>
          <p className="text-gray-500 text-sm mt-1">
            View scores and submission status for each exam.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading exams…
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p>No exams found. Create an exam first.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Exam selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Select Exam
              </label>
              <div className="flex flex-wrap gap-2">
                {exams.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => setSelectedExam(exam)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedExam?.id === exam.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {exam.title}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      selectedExam?.id === exam.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {exam.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary cards */}
            {selectedExam && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Registered', value: candidates.length, colour: 'text-gray-700' },
                  { label: 'Submitted', value: submitted.length, colour: 'text-blue-600' },
                  { label: 'Avg. Score', value: avgScore !== null ? `${avgScore}%` : '—', colour: 'text-emerald-600' },
                  { label: 'Pass / DQ', value: `${passCount} / ${dqCount}`, colour: 'text-gray-700' },
                ].map(({ label, value, colour }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className={`text-2xl font-bold ${colour}`}>{value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Candidate table */}
            {selectedExam && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Table toolbar */}
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, email, or code…"
                    className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => void loadCandidates(selectedExam.id)}
                    className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {candLoading ? (
                  <div className="flex items-center gap-3 p-8 text-gray-500 text-sm">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading results…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-10 text-center text-gray-400 text-sm">
                    {search ? 'No candidates match your search.' : 'No candidates found for this exam.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            #
                          </th>
                          <th
                            className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-blue-600"
                            onClick={() => toggleSort('name')}
                          >
                            Candidate <SortIcon col="name" />
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Code
                          </th>
                          <th
                            className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-blue-600"
                            onClick={() => toggleSort('status')}
                          >
                            Status <SortIcon col="status" />
                          </th>
                          <th
                            className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-blue-600"
                            onClick={() => toggleSort('score')}
                          >
                            Score <SortIcon col="score" />
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Answered
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Tab Switches
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Submitted At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filtered.map((c, i) => {
                          const badge = STATUS_BADGE[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' };
                          return (
                            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{c.name}</div>
                                <div className="text-xs text-gray-400">{c.email}</div>
                              </td>
                              <td className="px-4 py-3">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                                  {c.examCode}
                                </code>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <ScoreBadge score={c.score} status={c.status} />
                              </td>
                              <td className="px-4 py-3 text-center text-gray-600">
                                {c.totalAnswered !== undefined && c.totalAnswered !== null
                                  ? c.totalAnswered
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-sm font-medium ${
                                  c.tabSwitchCount >= 4 ? 'text-red-600' :
                                  c.tabSwitchCount >= 2 ? 'text-amber-600' : 'text-gray-600'
                                }`}>
                                  {c.tabSwitchCount}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">
                                {formatDate(c.submittedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
