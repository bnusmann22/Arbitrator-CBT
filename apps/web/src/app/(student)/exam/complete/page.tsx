'use client';

import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function ExamCompletePage() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [candidateName, setCandidateName] = useState<string>('');

  useEffect(() => {
    // Pull candidate name from sessionStorage if the exam page stored it
    try {
      const raw = sessionStorage.getItem('examResult');
      if (raw) {
        const parsed = JSON.parse(raw) as { candidateName?: string };
        if (parsed.candidateName) setCandidateName(parsed.candidateName);
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '4px solid rgba(99,102,241,0.25)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'fixed',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'rgba(99,102,241,0.12)',
        filter: 'blur(90px)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)',
        backdropFilter: 'blur(20px)',
      }}>

        {/* Top accent bar */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
        }} />

        {/* Header */}
        <div style={{
          padding: isMobile ? '28px 20px 20px' : '40px 36px 28px',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Animated checkmark circle */}
          <div style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.2))',
            border: '2px solid rgba(99,102,241,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '2.4rem',
            animation: 'fadeIn 0.5s ease-out',
          }}>
            ✅
          </div>

          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            color: '#f1f5f9',
            letterSpacing: '-0.04em',
            marginBottom: 10,
            lineHeight: 1.2,
          }}>
            {candidateName ? `Well done, ${candidateName.split(' ')[0]}!` : 'Exam Submitted!'}
          </h1>

          <p style={{
            fontSize: '0.92rem',
            color: '#64748b',
            lineHeight: 1.65,
            maxWidth: 340,
            margin: '0 auto',
          }}>
            Your answers have been recorded and submitted successfully.
            Your exam session is now closed.
          </p>
        </div>

        {/* Main message */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 36px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Info card */}
          <div style={{
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 14,
            padding: '20px 20px',
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(99,102,241,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0,
            }}>
              📬
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#c7d2fe', marginBottom: 6 }}>
                Results will be sent to you
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
                The exam administrator will review your submission and
                send your official result to you via email or WhatsApp.
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🔍', text: 'Administrator reviews and generates your result' },
              { icon: '📄', text: 'A result certificate is prepared with your score' },
              { icon: '📲', text: 'Results sent to you via email or WhatsApp' },
            ].map(({ icon, text }) => (
              <div key={text} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.8rem',
                color: '#475569',
              }}>
                <span style={{ fontSize: '1rem', width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '16px' : '20px 36px',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '0.72rem',
            color: '#334155',
            lineHeight: 1.7,
          }}>
            Your session is complete. You may safely close this window.
            <br />
            Do not attempt to re-open the exam link.
          </p>
        </div>
      </div>

      {/* Branding */}
      <p style={{
        position: 'relative',
        zIndex: 1,
        marginTop: 28,
        fontSize: '0.68rem',
        color: '#1e293b',
        letterSpacing: '0.08em',
        textAlign: 'center',
      }}>
        ARBITRATION SANDBOX · SECURE EXAMINATION PLATFORM
      </p>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
