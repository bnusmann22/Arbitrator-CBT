'use client';

import { useState } from 'react';
import styles from './CandidateTable.module.css';

export interface CandidateRow {
  id: string;
  name: string;
  email: string;
  examCode: string;
  status: string;
  score?: number;
  submittedAt?: string;
  createdAt: string;
}

interface CandidateTableProps {
  candidates: CandidateRow[];
  onDelete: (id: string) => void;
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function CandidateTable({ candidates, onDelete }: CandidateTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleDelete(c: CandidateRow) {
    if (!confirm(`Remove ${c.name} (${c.examCode}) from this exam? This cannot be undone.`)) return;

    setDeletingId(c.id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/candidates/${c.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      onDelete(c.id);
    } catch {
      alert('Failed to delete candidate. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleCopy(c: CandidateRow) {
    navigator.clipboard.writeText(c.examCode).then(() => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Exam Code</th>
            <th>Status</th>
            <th>Score</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {candidates.length === 0 ? (
            <tr>
              <td colSpan={6} className={styles.empty}>
                No candidates yet. Add candidates below.
              </td>
            </tr>
          ) : (
            candidates.map((c) => (
              <tr key={c.id}>
                <td className={styles.nameCell}>
                  <div className={styles.name}>{c.name}</div>
                  <div className={styles.email}>{c.email}</div>
                </td>

                <td>
                  <div className={styles.codeWrapper}>
                    <span className={styles.code}>{c.examCode}</span>
                    <button
                      className={`${styles.copyBtn} ${copiedId === c.id ? styles.copied : ''}`}
                      onClick={() => handleCopy(c)}
                      title="Copy exam code"
                      aria-label="Copy exam code"
                    >
                      {copiedId === c.id ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  </div>
                </td>

                <td>
                  <span className={`${styles.status} ${styles[c.status]}`}>
                    {c.status.replace('-', ' ')}
                  </span>
                </td>

                <td>
                  {c.score != null
                    ? `${c.score}%`
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>

                <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatDate(c.createdAt)}
                </td>

                <td>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    aria-label="Remove candidate"
                    title="Remove candidate"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {candidates.length > 0 && (
        <div className={styles.summary}>
          <span><span className={styles.summaryCount}>{candidates.length}</span> candidates</span>
          <span>{candidates.filter((c) => c.status === 'submitted').length} submitted</span>
        </div>
      )}
    </div>
  );
}
