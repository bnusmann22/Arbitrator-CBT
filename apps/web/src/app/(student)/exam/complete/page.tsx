'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ExamResult {
  score?: number;           // correct answers count
  totalQuestions?: number;
  totalAnswered?: number;
  percentage?: number;      // 0-100
  disqualified?: boolean;
  timedOut?: boolean;
}

function ScoreRing({ percentage }: { percentage: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (percentage / 100) * circumference;

  const colour =
    percentage >= 70
      ? '#22c55e'   // green
      : percentage >= 50
      ? '#f59e0b'   // amber
      : '#ef4444';  // red

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={colour}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      {/* Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: colour }}>
          {percentage}%
        </span>
        <span className="text-xs text-gray-400">Score</span>
      </div>
    </div>
  );
}

export default function ExamCompletePage() {
  const router = useRouter();
  const [result, setResult] = useState<ExamResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read result written by exam page before redirect
    const raw = sessionStorage.getItem('examResult');
    if (raw) {
      try {
        setResult(JSON.parse(raw) as ExamResult);
      } catch {
        setResult({});
      }
    } else {
      setResult({});
    }
    setMounted(true);
  }, []);

  if (!mounted || result === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Determine outcome ────────────────────────────────────────────────────────
  const isDisqualified = result.disqualified === true;
  const isTimedOut = result.timedOut === true;
  const percentage = result.percentage ?? 0;
  const passed = !isDisqualified && percentage >= 50;

  let headline: string;
  let subtext: string;
  let emoji: string;
  let headerBg: string;

  if (isDisqualified) {
    headline = 'Exam Disqualified';
    subtext = 'You were disqualified due to excessive tab switching. Your exam session has been closed.';
    emoji = '🚫';
    headerBg = 'bg-red-600';
  } else if (isTimedOut) {
    headline = 'Time Expired';
    subtext = 'The exam time limit was reached. Your answers have been submitted automatically.';
    emoji = '⏰';
    headerBg = 'bg-amber-500';
  } else if (passed) {
    headline = 'Exam Completed';
    subtext = 'You have successfully completed the examination.';
    emoji = '🎉';
    headerBg = 'bg-emerald-600';
  } else {
    headline = 'Exam Completed';
    subtext = 'You have completed the examination.';
    emoji = '📝';
    headerBg = 'bg-blue-600';
  }

  return (
    /* Prevent any right-click / copy on result page too */
    <div
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Coloured header */}
          <div className={`${headerBg} px-6 py-8 text-white text-center`}>
            <div className="text-5xl mb-3">{emoji}</div>
            <h1 className="text-2xl font-bold">{headline}</h1>
            <p className="text-white/80 text-sm mt-2 leading-relaxed">{subtext}</p>
          </div>

          {/* Score section */}
          {!isDisqualified && (
            <div className="px-6 py-8">
              <ScoreRing percentage={percentage} />

              {/* Stats grid */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {result.score ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Correct</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {result.totalAnswered ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Answered</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900">
                    {result.totalQuestions ?? 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Total</div>
                </div>
              </div>

              {/* Result banner */}
              <div className={`mt-6 rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                passed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passed ? '✅ Result: PASS' : '❌ Result: FAIL'}
              </div>
            </div>
          )}

          {/* Disqualified message */}
          {isDisqualified && (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500 leading-relaxed">
                Your result has been recorded as <strong>disqualified</strong>.
                Please contact the exam administrator if you believe this is an error.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pb-6">
            <div className="border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
              <p>This window is read-only. Your result has been saved.</p>
              <p className="mt-1">You may close this tab.</p>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Arbitration Sandbox — Secure Examination Platform
        </p>
      </div>
    </div>
  );
}
