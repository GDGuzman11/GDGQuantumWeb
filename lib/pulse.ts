/**
 * Click pulse signal (Layer ③ interactivity).
 *
 * A click anywhere fires a pulse; the Core reads a decaying 0→1 envelope each
 * frame and flares/shatters in response, then settles. Mutable singleton in the
 * style of `lib/warp.ts` / `lib/pointer.ts` — read in the R3F loop without
 * re-rendering. The envelope is derived from the click timestamp so every
 * consumer sees the same decay without anyone having to "own" the countdown.
 */

const DECAY = 3.2; // higher = snappier (≈0.5s tail)

let clickTime = -Infinity;

/** Fire a pulse now (called from a pointerdown listener). */
export function firePulse(): void {
  clickTime = performance.now() / 1000;
}

/** Decaying 0→1 envelope since the last click (0 when idle). */
export function getPulse(): number {
  const t = performance.now() / 1000 - clickTime;
  if (t < 0 || t > 2) return 0;
  return Math.exp(-t * DECAY);
}
