'use client';

import React from 'react';

interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface QuestionCardProps {
  index: number;          // 0-based display index (shown as index+1)
  totalQuestions: number;
  questionText: string;
  options: QuestionOptions;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  onSelect: (option: 'A' | 'B' | 'C' | 'D') => void;
  onPrev: () => void;
  onNext: () => void;
  isSaving?: boolean;
}

const OPTION_KEYS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

const OPTION_LABEL_STYLE = 'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none';
const OPTION_SELECTED = 'border-blue-500 bg-blue-50 text-blue-900';
const OPTION_UNSELECTED = 'border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50/50';

export default function QuestionCard({
  index,
  totalQuestions,
  questionText,
  options,
  selectedOption,
  onSelect,
  onPrev,
  onNext,
  isSaving = false,
}: QuestionCardProps) {
  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Question {index + 1} of {totalQuestions}
        </span>
        {isSaving && (
          <span className="text-xs text-blue-500 animate-pulse">Saving…</span>
        )}
      </div>

      {/* Question body */}
      <div className="p-6">
        {/* Question text */}
        <p className="text-gray-900 text-base leading-relaxed font-medium mb-6 whitespace-pre-wrap">
          {questionText}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
          {OPTION_KEYS.map((key) => {
            const isSelected = selectedOption === key;
            return (
              <label
                key={key}
                className={`${OPTION_LABEL_STYLE} ${isSelected ? OPTION_SELECTED : OPTION_UNSELECTED}`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={key}
                  checked={isSelected}
                  onChange={() => onSelect(key)}
                  className="sr-only"
                />
                {/* Option letter bubble */}
                <span
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 text-gray-500'
                  }`}
                >
                  {key}
                </span>
                <span className="text-sm leading-relaxed pt-0.5">{options[key]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Navigation footer */}
      <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          ← Previous
        </button>

        {selectedOption && (
          <button
            onClick={() => onSelect(selectedOption)} // re-select = clear (handled by parent)
            className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
          >
            Clear answer
          </button>
        )}

        <button
          onClick={onNext}
          disabled={index === totalQuestions - 1}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
