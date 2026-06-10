'use client';

import { useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/lib/site-config';
import { markRevealStarted } from '@/lib/reveal';

/**
 * Full-screen preloader overlay with a REAL-progress percentage counter.
 *
 * Progress is driven by genuine load signals, not a fake timer:
 *   - `document.fonts.ready` (Instrument Serif + Inter must be ready so the
 *     hero headline paints in its final face — this is the CLS-sensitive bit)
 *   - the window `load` event (key above-the-fold assets parsed)
 * Each resolved signal advances a target; the displayed number eases toward
 * that target on rAF so it always counts smoothly to 100 and never stalls.
 *
 * Guarantees:
 *   - never traps: a hard MAX_DURATION fail-safe forces completion even if a
 *     signal never fires (e.g. fonts API unsupported, asset hangs).
 *   - tasteful MIN_DURATION so it doesn't flash on fast/cached loads.
 *   - prefers-reduced-motion: resolves effectively instantly, no long count,
 *     no fade — overlay is simply removed.
 *   - locks body scroll while visible; releases on reveal.
 */

const MIN_DURATION = 1100; // ms — floor so the reveal feels intentional
const MAX_DURATION = 6000; // ms — hard fail-safe; never trap the user
const EASE_RATE = 0.08; // displayed number eases toward target each frame

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Refs so the rAF loop reads live values without re-subscribing.
  const targetRef = useRef(0);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;

    startRef.current = performance.now();

    // Lock scroll while the overlay is up.
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    // Real load signals each contribute to the target.
    let fontsWeight = 0; // 0..0.5
    let loadWeight = 0; // 0..0.5
    const recompute = () => {
      targetRef.current = Math.min(1, fontsWeight + loadWeight);
    };

    // Baseline so the bar isn't frozen at 0 before signals land.
    targetRef.current = 0.12;

    // Fonts (CLS-critical): wait for both faces to be ready.
    if ('fonts' in document) {
      document.fonts.ready
        .then(() => {
          fontsWeight = 0.5;
          recompute();
        })
        .catch(() => {
          fontsWeight = 0.5;
          recompute();
        });
    } else {
      fontsWeight = 0.5;
      recompute();
    }

    // Window load (above-the-fold assets parsed).
    const onLoad = () => {
      loadWeight = 0.5;
      recompute();
    };
    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    const tick = (now: number) => {
      const elapsed = now - startRef.current;

      // In reduced-motion, drive straight to target; otherwise ease.
      const eased = reducedRef.current
        ? targetRef.current
        : null;

      setProgress((prev) => {
        const target = targetRef.current;
        const next =
          eased !== null
            ? target
            : prev + (target - prev) * EASE_RATE + 0.004; // small floor keeps it moving
        return Math.min(target, Math.max(prev, next));
      });

      const minMet = elapsed >= MIN_DURATION || reducedRef.current;
      const maxHit = elapsed >= MAX_DURATION;
      const targetComplete = targetRef.current >= 1;

      if ((targetComplete && minMet) || maxHit) {
        setProgress(1);
        setDone(true);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('load', onLoad);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, []);

  // After the count completes, release scroll and remove the node.
  useEffect(() => {
    if (!done) return;
    document.documentElement.style.overflow = '';

    // Signal the hero/panels to begin their entrance reveal at the exact moment
    // the overlay starts clearing, so the reveal is choreographed with the fade
    // (motion path) or simply unblocks instantly (reduced-motion). Idempotent.
    markRevealStarted();

    if (reducedRef.current) {
      setHidden(true);
      return;
    }
    // Allow the CSS fade-out to play, then unmount.
    const t = window.setTimeout(() => setHidden(true), 700);
    return () => window.clearTimeout(t);
  }, [done]);

  if (hidden) return null;

  const pct = Math.round(progress * 100);

  return (
    <div
      // aria-hidden: the loading number is decorative chrome; reduced-motion
      // users skip it almost instantly. A polite status is provided for SRs.
      // Phase 3R — data-theme="dark" makes the overlay match the dark Landing
      // entry (dark bg-bg + light text), so the reveal fades straight into the
      // particle tunnel with no light→dark flash.
      data-theme="dark"
      className={[
        'fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg',
        'transition-opacity ease-out',
        done && !reducedRef.current ? 'opacity-0 duration-700' : 'opacity-100 duration-0',
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${siteConfig.brand}`}
    >
      <span className="sr-only">Loading, {pct} percent</span>

      <div aria-hidden className="flex flex-col items-center gap-6">
        <span className="font-sans text-[0.65rem] uppercase tracking-[0.35em] text-muted">
          {siteConfig.brand}
        </span>
        <span className="font-serif text-7xl tabular-nums leading-none text-ink sm:text-8xl">
          {pct}
        </span>
        <div className="h-px w-40 overflow-hidden bg-hairline">
          <div
            className="h-px bg-ink"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
