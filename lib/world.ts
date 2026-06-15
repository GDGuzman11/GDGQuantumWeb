/**
 * World state — the dark "flow" world ⇄ the white "neuron" world.
 *
 * `world` is an eased 0→1 scalar: 0 = dark flowing tunnel, 1 = white neuron
 * world. Clicking the orb calls `toggleWorld()`, which flips the target and
 * lets the value ease across; every consumer reads the live value:
 *   • WorldController (DOM)  — drives the white-flash, swaps the <body> theme at
 *                              the midpoint, and publishes `--world` as a CSS var
 *                              so dark "artwork" layers can fade via calc().
 *   • TunnelCanvas / Core (WebGL) — morph their look from flow→neuron /
 *                              crystal→ferrofluid as `world` crosses.
 *
 * Mutable singleton + tiny pub/sub in the style of `lib/warp.ts` — read in the
 * R3F loop without React re-renders; DOM consumers subscribe via `onWorld`.
 */

let world = 0; // live eased value
let target = 0; // 0 or 1
let from = 0; // world value when the current transition started
let startTime = 0; // performance.now() when the current transition started
let raf = 0;
let instant = false; // reduced-motion: snap instead of ease

const DURATION = 1300; // ms — full dark⇄white transition

const subs = new Set<(v: number) => void>();

function emit(): void {
  for (const cb of Array.from(subs)) cb(world);
}

/**
 * Smootherstep — a SYMMETRIC ease-in-out (slow at both ends, fast in the
 * middle). Replaces the old exponential `world += d*0.04` ease-OUT, which was
 * always fast-at-start / slow-at-end and therefore ASYMMETRIC: the bust↔orb
 * morph lives in the high end of the 0→1 range, so dark→white traversed it in
 * the slow tail (gradual, nice) while white→dark hit it in the fast head (the
 * morph rushed by in ~0.3s, then a long crawl where nothing visibly morphed —
 * the "freeze then snap back to the orb" bug). A time-based ease-in-out makes
 * both directions read identically.
 */
function easeInOut(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function tick(): void {
  const t = Math.min(1, (performance.now() - startTime) / DURATION);
  world = from + (target - from) * easeInOut(t);
  emit();
  if (t >= 1) {
    world = target;
    emit();
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(tick);
}

/** Read the current world value (0 dark-flow … 1 white-neuron). */
export function getWorld(): number {
  return world;
}

/** Is the target the white world? (true once toggled on, until toggled back) */
export function isWhiteWorld(): boolean {
  return target > 0.5;
}

/** Reduced-motion: snap transitions instead of easing. */
export function setWorldInstant(on: boolean): void {
  instant = on;
}

/** Flip dark ⇄ white. */
export function toggleWorld(): void {
  setWhiteWorld(target <= 0.5);
}

/** Go to the white or dark world. Internal — `toggleWorld()` is the public flip. */
function setWhiteWorld(white: boolean): void {
  const t = white ? 1 : 0;
  if (t === target) return;
  target = t;
  if (instant) {
    world = target;
    emit();
    return;
  }
  // Re-base the tween on the CURRENT value so a mid-transition toggle reverses
  // smoothly from where it is (no jump), and both directions ease symmetrically.
  from = world;
  startTime = performance.now();
  if (!raf) raf = requestAnimationFrame(tick);
}

/** Subscribe to world changes; fires immediately with the current value. */
export function onWorld(cb: (v: number) => void): () => void {
  subs.add(cb);
  cb(world);
  return () => {
    subs.delete(cb);
  };
}
