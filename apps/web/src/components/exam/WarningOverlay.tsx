'use client';

import React from 'react';

interface WarningOverlayProps {
  tabSwitchCount: number;
  maxSwitches?: number;
  onDismiss: () => void;
}

export default function WarningOverlay({
  tabSwitchCount,
  maxSwitches = 5,
  onDismiss,
}: WarningOverlayProps) {
  const remaining = maxSwitches - tabSwitchCount;
  const isCritical = remaining <= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="warning-title"
    >
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Coloured top bar */}
        <div className={`h-2 ${isCritical ? 'bg-red-500' : 'bg-amber-400'}`} />

        <div className="p-6 text-center">
          {/* Icon */}
          <div className="text-5xl mb-4">{isCritical ? '🚨' : '⚠️'}</div>

          <h2 id="warning-title" className="text-xl font-bold text-gray-900 mb-2">
            Tab Switch Detected!
          </h2>

          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            You have switched tabs or minimised the browser.
            <br />
            This action has been recorded by the exam system.
          </p>

          {/* Counter */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
            isCritical
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            <span>
              Switch {tabSwitchCount} of {maxSwitches}
            </span>
          </div>

          {remaining > 0 ? (
            <p className="text-sm text-gray-500 mb-6">
              {isCritical ? (
                <span className="text-red-600 font-semibold">
                  ⚠️ One more switch will disqualify you!
                </span>
              ) : (
                <>You have <strong>{remaining}</strong> switch{remaining === 1 ? '' : 'es'} remaining before disqualification.</>
              )}
            </p>
          ) : (
            <p className="text-sm text-red-600 font-semibold mb-6">
              You have been disqualified. Your exam has been submitted automatically.
            </p>
          )}

          <button
            onClick={onDismiss}
            autoFocus
            className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isCritical
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400'
            }`}
          >
            I understand — return to exam
          </button>
        </div>
      </div>
    </div>
  );
}
