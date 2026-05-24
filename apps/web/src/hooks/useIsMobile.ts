import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport is narrower than `breakpoint` px.
 * Starts as `false` (safe for SSR) and updates after first paint.
 */
export function useIsMobile(breakpoint = 700): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return mobile;
}
