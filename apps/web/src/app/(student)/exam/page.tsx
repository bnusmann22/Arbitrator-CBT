'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useExamTimer } from '@/hooks/useExamTimer';
import { useTabMonitor } from '@/hooks/useTabMonitor';
import ExamHeader from '@/components/exam/ExamHeader';
import QuestionNav from '@/components/exam/QuestionNav';
import QuestionCard from '@/components/exam/QuestionCard';
import WarningOverlay from '@/components/exam/WarningOverlay';
import SubmitConfirmModal from '@/components/exam/SubmitConfirmModal';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order?: number;
}

interface StartResponse {
  sessionId: string;
  questions: Question[];
  durationMinutes: number;
  startTime: string;
  endTime: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
}

type OptionKey = 'A' | 'B' | 'C' | 'D';

// ── Phase states ───────────────────────────────────────────────────────────────

type Phase = 'loading' | 'exam' | 'error';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExamPage() {
  const router = useRouter();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<Phase>('loading');
  const [error, setError]               = useState<string | null>(null);
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [endTime, setEndTime]           = useState<string | null>(null);
  const [examTitle, setExamTitle]       = useState<string | undefined>();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers: questionId → option (or null for cleared)
  const [answers, setAnswers]           = useState<Record<string, OptionKey | null>>({});

  // Which questions have been visited (to distinguish not-visited from skipped)
  const [visited, setVisited]           = useState<Set<number>>(new Set());

  // Tab switch state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning]       = useState(false);

  // UI state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSaving, setIsSaving]               = useState(false);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [examActive, setExamActive]           = useState(false);

  // Debounce answer saves
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Timer hook ─────────────────────────────────────────────────────────────
  const { secondsLeft, isExpired, formatted } = useExamTimer(endTime);

  // ── Tab monitor hook ───────────────────────────────────────────────────────
  const handleTabSwitch = useCallback(
    (count: number, disqualified: boolean) => {
      setTabSwitchCount(count);
      setShowWarning(true);
      if (disqualified) {
        // Server already submitted; redirect to complete page
        sessionStorage.setItem('examResult', JSON.stringify({ disqualified: true }));
        router.replace('/exam/complete');
      }
    },
    [router],
  );

  useTabMonitor(examActive, handleTabSwitch);

  // ── Start / resume exam on mount ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = (await api.post('/exam/start')) as StartResponse;

        setQuestions(data.questions);
        setEndTime(data.endTime);

        // Restore prior answers if resuming mid-exam
        if (data.answers && typeof data.answers === 'object') {
          const restored: Record<string, OptionKey | null> = {};
          const visitedSet = new Set<number>();

          for (const [qId, opt] of Object.entries(data.answers)) {
            restored[qId] = opt as OptionKey | null;
            const idx = data.questions.findIndex((q) => q.id === qId);
            if (idx !== -1) visitedSet.add(idx);
          }

          setAnswers(restored);
          setVisited(visitedSet);
        }

        setPhase('exam');
        setExamActive(true);

        // Mark question 0 as visited immediately
        setVisited((v) => new Set(v).add(0));
      } catch (err: unknown) {
        const msg =
          (err as { message?: string })?.message ??
          'Failed to start exam. Please contact the administrator.';
        setError(msg);
        setPhase('error');
      }
    })();
  }, []);

  // ── Auto-submit when timer expires ────────────────────────────────────────
  useEffect(() => {
    if (isExpired && examActive) {
      setExamActive(false);
      // Backend cron will submit, but we can also trigger it from the client
      void api.post('/exam/submit').catch(() => {});
      sessionStorage.setItem('examResult', JSON.stringify({ timedOut: true }));
      router.replace('/exam/complete');
    }
  }, [isExpired, examActive, router]);

  // ── Save answer to backend (debounced 400 ms) ─────────────────────────────
  const persistAnswer = useCallback(
    (questionId: string, selectedOption: OptionKey | null) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setIsSaving(true);

      saveTimerRef.current = setTimeout(async () => {
        try {
          await api.post('/exam/answer', { questionId, selectedOption });
        } catch {
          // Silently ignore — answer is still stored locally
        } finally {
          setIsSaving(false);
        }
      }, 400);
    },
    [],
  );

  // ── Select / deselect answer ───────────────────────────────────────────────
  const handleSelect = useCallback(
    (option: OptionKey) => {
      const qId = questions[currentIndex]?.id;
      if (!qId) return;

      setAnswers((prev) => {
        // Clicking the same option clears it (toggle)
        const next = prev[qId] === option ? null : option;
        persistAnswer(qId, next);
        return { ...prev, [qId]: next };
      });
    },
    [currentIndex, questions, persistAnswer],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = useCallback((targetIndex: number) => {
    const clamped = Math.max(0, Math.min(targetIndex, questions.length - 1));
    setCurrentIndex(clamped);
    setVisited((v) => new Set(v).add(clamped));
  }, [questions.length]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleConfirmSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setExamActive(false);

    try {
      const result = await api.post('/exam/submit') as {
        score: number;
        totalQuestions: number;
        totalAnswered: number;
        percentage: number;
      };

      sessionStorage.setItem('examResult', JSON.stringify(result));
      router.replace('/exam/complete');
    } catch {
      // Even on error, redirect — the backend may have auto-submitted
      sessionStorage.setItem('examResult', JSON.stringify({}));
      router.replace('/exam/complete');
    }
  }, [router]);

  // ── Anti-cheat: block right-click / copy / paste / DevTools keys ──────────
  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();
  const handleCopy = (e: React.ClipboardEvent) => e.preventDefault();
  const handleCut = (e: React.ClipboardEvent) => e.preventDefault();
  const handlePaste = (e: React.ClipboardEvent) => e.preventDefault();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Block DevTools shortcuts
    if (e.key === 'F12') {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return;
    }
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const answeredCount = Object.values(answers).filter(
    (v) => v !== null && v !== undefined,
  ).length;

  const navItems = questions.map((q, i) => {
    const hasAnswer = answers[q.id] != null;
    let status: 'not-visited' | 'answered' | 'current' | 'not-answered';

    if (i === currentIndex) {
      status = 'current';
    } else if (hasAnswer) {
      status = 'answered';
    } else if (visited.has(i)) {
      status = 'not-answered';
    } else {
      status = 'not-visited';
    }

    return { index: i, status };
  });

  const currentQuestion = questions[currentIndex];

  // ── Render: Loading ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm">Preparing your exam…</p>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Start Exam</h1>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Exam ───────────────────────────────────────────────────────────
  return (
    <div
      style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', userSelect: 'none' }}
      onContextMenu={handleContextMenu}
      onCopy={handleCopy}
      onCut={handleCut}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
    >
      {/* Sticky header */}
      <ExamHeader
        examTitle={examTitle}
        timeFormatted={formatted}
        secondsLeft={secondsLeft}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        tabSwitchCount={tabSwitchCount}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '28px 20px', display: 'flex', gap: 20 }}>

        {/* Question panel */}
        {currentQuestion && (
          <QuestionCard
            index={currentIndex}
            totalQuestions={questions.length}
            questionText={currentQuestion.questionText}
            options={currentQuestion.options}
            selectedOption={answers[currentQuestion.id] ?? null}
            onSelect={handleSelect}
            onPrev={() => navigate(currentIndex - 1)}
            onNext={() => navigate(currentIndex + 1)}
            isSaving={isSaving}
          />
        )}

        {/* Sidebar nav */}
        <QuestionNav
          items={navItems}
          currentIndex={currentIndex}
          onNavigate={navigate}
        />
      </div>

      {/* Overlays */}
      {showWarning && (
        <WarningOverlay
          tabSwitchCount={tabSwitchCount}
          onDismiss={() => setShowWarning(false)}
        />
      )}

      {showSubmitModal && (
        <SubmitConfirmModal
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowSubmitModal(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
