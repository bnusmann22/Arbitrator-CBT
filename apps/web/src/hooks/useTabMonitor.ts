'use client';

import { useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';

interface TabSwitchResult {
  tabSwitches: number;
  disqualified: boolean;
}

/**
 * Monitors tab/window visibility and reports each focus-loss event to the API.
 *
 * @param enabled   Set to false once the exam is submitted/not yet started
 * @param onSwitch  Called with { tabSwitches, disqualified } after each report
 */
export function useTabMonitor(
  enabled: boolean,
  onSwitch: (count: number, disqualified: boolean) => void,
) {
  // Prevent duplicate reports from rapid visibility events
  const reportingRef = useRef(false);

  const reportTabSwitch = useCallback(async () => {
    if (reportingRef.current) return;
    reportingRef.current = true;

    try {
      const result = (await api.post('/exam/tab-switch')) as TabSwitchResult;
      onSwitch(result.tabSwitches, result.disqualified);
    } catch {
      // Silently ignore network errors — the candidate is already warned via UI
    } finally {
      reportingRef.current = false;
    }
  }, [onSwitch]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        void reportTabSwitch();
      }
    };

    // Also catch window blur (Alt+Tab, clicking taskbar, etc.)
    const handleBlur = () => {
      void reportTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, reportTabSwitch]);
}
