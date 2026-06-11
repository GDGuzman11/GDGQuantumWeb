/**
 * Shared "dive into the void" warp progress (Phase 3R.2).
 *
 * `PanelDeck` drives this from each transition's GSAP timeline as a 0→1 scrub:
 *   0 = at rest on any panel (tunnel calm)
 *   → 1 = transition complete
 * The WebGL tunnel reads it as a PULSE (`sin(dive·π)`), so a 0→1 scrub gives a
 * clean calm→light-speed→calm pulse REGARDLESS of travel direction — the same
 * scrub serves both forward and reverse on every leg. It is reset to 0 at rest.
 *
 * The WebGL tunnel polls `getDive()` every frame to drive its warp. It's a plain
 * mutable singleton — NOT React state — so the R3F render loop reads the live
 * value without forcing re-renders. Mirrors the latched pub/sub style of
 * `lib/reveal.ts`, but this is a continuously-scrubbed scalar rather than a
 * one-shot signal, so it's a simple get/set.
 */

let dive = 0;

/** Set the current dive progress (clamped to [0, 1]). */
export function setDive(v: number): void {
  dive = v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Read the current dive progress (0 = at rest, ramps 0→1 across a transition). */
export function getDive(): number {
  return dive;
}
