'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Whisper-of-parallax wrapper for the hero (logo + intro). The content shifts a
 * few pixels toward the cursor and gently floats on idle, so it feels alive and
 * sits in front of the fixed starfield with a touch of depth. Pure rAF (no
 * GSAP); transform only, so it never affects layout.
 *
 * Reduced-motion: disabled entirely (static). Touch: no pointer shift, just the
 * gentle idle float.
 */
export function HeroStage({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 14; // px (whisper)
      target.y = (e.clientY / window.innerHeight - 0.5) * 10;
    };
    if (!coarse) window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      const bob = Math.sin((t - start) / 1700) * 4; // gentle idle float
      el.style.transform = `translate3d(${cur.x.toFixed(2)}px, ${(
        cur.y + bob
      ).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
