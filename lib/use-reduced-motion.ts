'use client';

import { useEffect, useState } from 'react';

/**
 * Client hook for `prefers-reduced-motion: reduce`, reacting live to OS toggles.
 *
 * Returns `null` until measured on the client. This three-state shape is
 * deliberate: it lets callers render a motion-agnostic first paint (matching
 * SSR) and only commit to an animated-vs-static path once the real preference
 * is known, avoiding both hydration mismatches and a flash of the wrong state.
 *
 * Per CLAUDE.md §2, reduced-motion is a correctness requirement: when this is
 * `true`, callers MUST disable snapping/smoothing, the hero float, and entrance
 * animations (instant reveals instead).
 */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // older Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}
