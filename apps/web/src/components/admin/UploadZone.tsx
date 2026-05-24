'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import styles from './UploadZone.module.css';

interface UploadZoneProps {
  examId: string;
  onSuccess: (result: UploadResult) => void;
  disabled?: boolean;
}

export interface UploadResult {
  saved: number;
  needsReview: number;
  questions: ParsedQuestionRow[];
}

export interface ParsedQuestionRow {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  needsReview: boolean;
  order: number;
  sourceFile: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({ examId, onSuccess, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function validateFile(file: File): string {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only PDF and DOCX files are accepted.';
    }
    if (file.size > 50 * 1024 * 1024) {
      return 'File must be smaller than 50 MB.';
    }
    return '';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) selectFile(file);
  }

  function selectFile(file: File) {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !examId) return;
    setError('');
    setUploading(true);

    try {
      const form = new FormData();
      form.append('file', selectedFile);

      const res = await fetch(
        `/api/proxy/questions/upload?examId=${examId}`,
        {
          method: 'POST',
          credentials: 'include',
          body: form,
        },
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          Array.isArray(data?.message)
            ? data.message.join(' ')
            : data?.message ?? 'Upload failed.',
        );
        return;
      }

      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const zoneClass = [
    styles.zone,
    dragOver ? styles.dragover : '',
    selectedFile ? styles.fileSelected : '',
    disabled || uploading ? styles.disabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <div
        className={zoneClass}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload question file"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className={styles.hiddenInput}
          accept=".pdf,.docx"
          onChange={handleInputChange}
          disabled={uploading}
        />

        {selectedFile ? (
          <>
            <div className={styles.iconWrapper}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <polyline points="9 15 12 18 15 15"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
              </svg>
            </div>
            <p className={styles.fileName}>✓ {selectedFile.name}</p>
            <p className={styles.fileSize}>{formatBytes(selectedFile.size)}</p>
            <p className={styles.hint}>Click Upload to parse questions, or click here to change file</p>
          </>
        ) : (
          <>
            <div className={styles.iconWrapper}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className={styles.title}>
              {dragOver ? 'Drop file here' : 'Drag & drop your document'}
            </p>
            <p className={styles.subtitle}>or click to browse</p>
            <p className={styles.hint}>PDF or DOCX · max 50 MB · numbered MCQ format</p>
          </>
        )}

        {uploading && (
          <div className={styles.progress}>
            <div className={styles.progressBar} style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {error && (
        <p className={styles.error} style={{ marginTop: 'var(--space-sm)' }}>
          ⚠ {error}
        </p>
      )}

      {selectedFile && !uploading && (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <button
            onClick={handleUpload}
            disabled={!examId}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: examId ? 'pointer' : 'not-allowed',
              opacity: examId ? 1 : 0.5,
              fontSize: 'var(--text-sm)',
              transition: 'all var(--transition-fast)',
            }}
          >
            Upload & Parse
          </button>
          <button
            onClick={() => { setSelectedFile(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
