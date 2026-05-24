'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import type { UploadResult } from './UploadZone';

interface DualUploadZoneProps {
  examId: string;
  onSuccess: (result: UploadResult & { matched: number }) => void;
}

const QUESTION_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ANSWER_TYPES = [
  ...QUESTION_TYPES,
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/bmp',
  'image/tiff',
  'image/gif',
  'image/webp',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileZoneProps = {
  label: string;
  subtitle: string;
  accept: string;
  icon: string;
  accentColor: string;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
};

function FileZone({ label, subtitle, accept, icon, accentColor, file, onFile, onClear }: FileZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div>
      <div style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 8,
      }}>
        {icon} {label}
      </div>

      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? accentColor : file ? `${accentColor}88` : 'var(--border-primary)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '20px 16px',
          cursor: file ? 'default' : 'pointer',
          background: dragOver
            ? `${accentColor}0a`
            : file
            ? `${accentColor}06`
            : 'var(--bg-secondary)',
          transition: 'all 0.15s',
          minHeight: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          textAlign: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInput}
          style={{ display: 'none' }}
        />

        {file ? (
          <>
            <div style={{ fontSize: 22 }}>📄</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              {formatBytes(file.size)}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--accent-danger)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ✕ Remove
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 26, opacity: 0.5 }}>{dragOver ? '⬇' : '📎'}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {dragOver ? 'Drop here' : 'Drag & drop or click to browse'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DualUploadZone({ examId, onSuccess }: DualUploadZoneProps) {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [ocrNote, setOcrNote] = useState('');

  async function handleUpload() {
    if (!questionFile || !answerFile || !examId) return;
    setError('');
    setOcrNote('');
    setUploading(true);

    // If the answer file is an image, warn the user that OCR is running
    if (answerFile.type.startsWith('image/')) {
      setOcrNote('🔍 Running OCR on answer key image… this may take a moment.');
    }

    try {
      const form = new FormData();
      form.append('questionFile', questionFile);
      form.append('answerFile', answerFile);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/questions/upload-dual?examId=${examId}`,
        { method: 'POST', credentials: 'include', body: form },
      );

      const data = await res.json();
      setOcrNote('');

      if (!res.ok) {
        setError(
          Array.isArray(data?.message)
            ? data.message.join(' ')
            : data?.message ?? 'Upload failed.',
        );
        return;
      }

      setQuestionFile(null);
      setAnswerFile(null);
      onSuccess(data as UploadResult & { matched: number });
    } catch {
      setError('Network error. Please try again.');
      setOcrNote('');
    } finally {
      setUploading(false);
    }
  }

  const canUpload = !!questionFile && !!answerFile && !uploading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info banner */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: 'rgba(99,102,241,0.06)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <div>
          Upload your <strong style={{ color: 'var(--text-primary)' }}>question file</strong> (PDF/DOCX) and a separate{' '}
          <strong style={{ color: 'var(--text-primary)' }}>answer key file</strong> (PDF, DOCX, TXT, or image).
          The system will parse both files and automatically map the correct answers to their questions using their question numbers.
          Image answer keys are processed with <strong style={{ color: 'var(--text-primary)' }}>OCR (computer vision)</strong>.
        </div>
      </div>

      {/* Two-column file zones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FileZone
          label="Question File"
          subtitle="PDF or DOCX with numbered questions"
          accept=".pdf,.docx"
          icon="📋"
          accentColor="#6366f1"
          file={questionFile}
          onFile={setQuestionFile}
          onClear={() => setQuestionFile(null)}
        />
        <FileZone
          label="Answer Key File"
          subtitle="PDF, DOCX, TXT, or image (JPG, PNG…)"
          accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.bmp,.tiff,.gif,.webp"
          icon="🗝"
          accentColor="#10b981"
          file={answerFile}
          onFile={setAnswerFile}
          onClear={() => setAnswerFile(null)}
        />
      </div>

      {/* Answer key format hint */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 12px',
        lineHeight: 1.7,
      }}>
        <strong>Answer key format examples:</strong>{' '}
        <code style={{ color: 'var(--text-secondary)', fontSize: 11 }}>1. B</code>{' '}
        · <code style={{ color: 'var(--text-secondary)', fontSize: 11 }}>2) C</code>{' '}
        · <code style={{ color: 'var(--text-secondary)', fontSize: 11 }}>3-A</code>{' '}
        · <code style={{ color: 'var(--text-secondary)', fontSize: 11 }}>1.B 2.C 3.A</code>{' '}
        · table format · or a handwritten answer sheet image
      </div>

      {/* OCR note */}
      {ocrNote && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.9rem',
          color: '#a5b4fc',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
        }}>
          {ocrNote}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'hsla(0,80%,60%,0.08)',
          border: '1px solid hsla(0,80%,60%,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.6rem 0.9rem',
          color: 'var(--accent-danger)',
          fontSize: 'var(--text-sm)',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          style={{
            padding: '0.65rem 1.6rem',
            borderRadius: 'var(--radius-md)',
            background: canUpload ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: canUpload ? '#fff' : 'var(--text-muted)',
            border: 'none',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            cursor: canUpload ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {uploading ? (
            <>
              <span style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Processing…
            </>
          ) : '🗂 Upload & Map Answers'}
        </button>

        {(questionFile || answerFile) && (
          <button
            onClick={() => { setQuestionFile(null); setAnswerFile(null); setError(''); }}
            style={{
              padding: '0.65rem 1.2rem',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
