/**
 * Shared "dive into the void" progress for the Landing↔About transition
 * (Phase 3R.2).
 *
 * `PanelDeck` drives this from the 0↔1 GSAP timeline:
 *   0 = Landing at rest (tunnel calm, canvas fully visible)
 *   1 = arrived at About (tunnel was at light-speed, canvas faded out)
 * Forward (Landing→About) ramps 0→1; reverse (About→Landing) scrubs 1→0.
 *
 * The WebGL tunnel polls `getDive()` every frame to drive its warp, and the
 * tunnel host (`TunnelStage`) polls it to crossfade the canvas. It's a plain
 * mutable singleton — NOT React state — so the R3F render loop and the host's
 * rAF read the live value without forcing re-renders. Mirrors the latched
 * pub/sub style of `lib/reveal.ts`, but this is a continuously-scrubbed scalar
 * rather than a one-shot signal, so it's a simple get/set.
 */

let dive = 0;

/** Set the current dive progress (clamped to [0, 1]). */
export function setDive(v: number): void {
  dive = v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Read the current dive progress (0 = Landing rest, 1 = at About). */
export function getDive(): number {
  return dive;
}
