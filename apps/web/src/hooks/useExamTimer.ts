'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Counts down from the exam end time to zero.
 *
 * @param endTime  ISO date string returned by POST /exam/start
 * @returns        { secondsLeft, isExpired, formatted }
 */
export function useExamTimer(endTime: string | null) {
  const calcRemaining = () => {
    if (!endTime) return 0;
    return Math.max(0, Math.round((new Date(endTime).getTime() - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calcRemaining);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!endTime) return;

    // Recalculate immediately in case component mounted late
    setSecondsLeft(calcRemaining());

    intervalRef.current = setInterval(() => {
      const rem = calcRemaining();
      setSecondsLeft(rem);
      if (rem <= 0) {
        setIsExpired(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formatted =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { secondsLeft, isExpired, formatted };
}
