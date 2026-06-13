'use client';

import { useEffect, useRef } from 'react';
import { onWorld } from '@/lib/world';

/**
 * Drives the DOM side of the dark⇄white world transition (W1).
 *
 * Subscribes to the eased `world` scalar and, each step:
 *   1. publishes it as the CSS var `--world` on <body> so any dark "artwork"
 *      layer can fade out via `opacity: calc(1 - var(--world))` — no per-element
 *      JS wiring;
 *   2. swaps the <body> `data-theme` at the MIDPOINT (hidden under the flash),
 *      flipping every token-based font/label between the dark and light scopes;
 *   3. drives a full-screen white flash whose opacity peaks at the midpoint —
 *      the "white flash covers the page" beat — and clears as the new world
 *      settles in.
 *
 * Rendered once at the app root. Purely visual → aria-hidden.
 */
export function WorldController() {
  const flashRef = useRef<HTMLDivElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const body = document.body;
    return onWorld((v) => {
      body.style.setProperty('--world', v.toFixed(4));

      // Theme swap at the midpoint, hidden under the flash peak.
      const goingUp = v >= prev.current;
      if (goingUp && v >= 0.5 && body.dataset.theme === 'dark') {
        body.removeAttribute('data-theme'); // → :root light scope
      } else if (!goingUp && v < 0.5 && body.dataset.theme !== 'dark') {
        body.setAttribute('data-theme', 'dark');
      }
      prev.current = v;

      // White flash: peaks (1) at v=0.5, zero at both ends.
      const flash = Math.max(0, 1 - Math.abs(v - 0.5) * 2);
      if (flashRef.current) flashRef.current.style.opacity = flash.toFixed(4);
    });
  }, []);

  return (
    <div
      ref={flashRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] bg-white"
      style={{ opacity: 0 }}
    />
  );
}
