'use client';

import React from 'react';

export type QuestionNavStatus =
  | 'not-visited'
  | 'answered'
  | 'current'
  | 'not-answered'; // visited but left blank

interface QuestionNavItem {
  index: number;
  status: QuestionNavStatus;
}

interface QuestionNavProps {
  items: QuestionNavItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

const STATUS_STYLES: Record<QuestionNavStatus, string> = {
  'current':      'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1 font-bold',
  'answered':     'bg-emerald-500 text-white hover:bg-emerald-600',
  'not-answered': 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200',
  'not-visited':  'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200',
};

export default function QuestionNav({ items, currentIndex, onNavigate }: QuestionNavProps) {
  return (
    <aside className="w-52 shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-[73px]">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Questions
        </h2>

        {/* Legend */}
        <div className="flex flex-col gap-1.5 mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-emerald-500 inline-block" />
            Answered
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-orange-100 border border-orange-300 inline-block" />
            Skipped
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-gray-100 border border-gray-200 inline-block" />
            Not visited
          </div>
        </div>

        {/* Number grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((item) => (
            <button
              key={item.index}
              onClick={() => onNavigate(item.index)}
              className={`w-8 h-8 rounded text-xs transition-all ${STATUS_STYLES[item.status]}`}
              title={`Question ${item.index + 1} — ${item.status.replace('-', ' ')}`}
            >
              {item.index + 1}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Answered</span>
            <span className="font-medium text-emerald-600">
              {items.filter((i) => i.status === 'answered').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Skipped</span>
            <span className="font-medium text-orange-600">
              {items.filter((i) => i.status === 'not-answered').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Not visited</span>
            <span className="font-medium text-gray-600">
              {items.filter((i) => i.status === 'not-visited').length}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
