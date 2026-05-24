'use client';

import React from 'react';

interface ExamHeaderProps {
  examTitle?: string;
  timeFormatted: string;
  secondsLeft: number;
  answeredCount: number;
  totalQuestions: number;
  tabSwitchCount: number;
  onSubmit: () => void;
}

const TAB_WARNING_THRESHOLD = 3;   // yellow warning
const TAB_DISQUALIFY_THRESHOLD = 5; // red / disqualify

export default function ExamHeader({
  examTitle,
  timeFormatted,
  secondsLeft,
  answeredCount,
  totalQuestions,
  tabSwitchCount,
  onSubmit,
}: ExamHeaderProps) {
  // Colour of the timer based on time remaining
  const timerColour =
    secondsLeft <= 60
      ? 'text-red-600 animate-pulse'
      : secondsLeft <= 300
      ? 'text-amber-600'
      : 'text-emerald-700';

  // Colour of the tab-switch badge
  const tabBadgeColour =
    tabSwitchCount === 0
      ? 'bg-gray-100 text-gray-600'
      : tabSwitchCount < TAB_WARNING_THRESHOLD
      ? 'bg-yellow-100 text-yellow-700'
      : tabSwitchCount < TAB_DISQUALIFY_THRESHOLD
      ? 'bg-orange-100 text-orange-700 font-semibold'
      : 'bg-red-100 text-red-700 font-bold';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Exam in Progress</p>
          <h1 className="text-base font-semibold text-gray-900 truncate">
            {examTitle ?? 'Arbitration Sandbox'}
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{answeredCount}</span>
          <span>/</span>
          <span>{totalQuestions}</span>
          <span className="ml-1 text-gray-400">answered</span>
        </div>

        {/* Tab switch warning */}
        {tabSwitchCount > 0 && (
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${tabBadgeColour}`}>
            ⚠️ {tabSwitchCount} / {TAB_DISQUALIFY_THRESHOLD} tab switches
          </span>
        )}

        {/* Timer */}
        <div className={`font-mono text-xl font-bold tabular-nums ${timerColour}`}>
          {timeFormatted}
        </div>

        {/* Submit button */}
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Submit Exam
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{
            width: totalQuestions > 0
              ? `${Math.round((answeredCount / totalQuestions) * 100)}%`
              : '0%',
          }}
        />
      </div>
    </header>
  );
}
