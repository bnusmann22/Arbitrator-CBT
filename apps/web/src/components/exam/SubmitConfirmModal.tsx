'use client';

import React from 'react';

interface SubmitConfirmModalProps {
  answeredCount: number;
  totalQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function SubmitConfirmModal({
  answeredCount,
  totalQuestions,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: SubmitConfirmModalProps) {
  const unanswered = totalQuestions - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-5 text-white">
          <h2 id="confirm-title" className="text-lg font-bold">
            Submit Exam?
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            This action cannot be undone.
          </p>
        </div>

        {/* Summary */}
        <div className="p-6">
          <div className="flex justify-around mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{answeredCount}</div>
              <div className="text-xs text-gray-500 mt-1">Answered</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className={`text-3xl font-bold ${unanswered > 0 ? 'text-amber-500' : 'text-gray-300'}`}>
                {unanswered}
              </div>
              <div className="text-xs text-gray-500 mt-1">Unanswered</div>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-700">{totalQuestions}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
          </div>

          {unanswered > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-700">
              ⚠️ You have <strong>{unanswered}</strong> unanswered question{unanswered > 1 ? 's' : ''}.
              Unanswered questions will be marked as incorrect.
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
            >
              Continue Exam
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                'Submit Now'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
