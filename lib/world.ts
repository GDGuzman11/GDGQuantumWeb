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
let raf = 0;
let instant = false; // reduced-motion: snap instead of ease

const subs = new Set<(v: number) => void>();

function emit(): void {
  for (const cb of Array.from(subs)) cb(world);
}

function tick(): void {
  const d = target - world;
  if (Math.abs(d) < 0.002) {
    world = target;
    emit();
    raf = 0;
    return;
  }
  world += d * 0.05; // ~1.2s cinematic ease at 60fps
  emit();
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
  target = target > 0.5 ? 0 : 1;
  if (instant) {
    world = target;
    emit();
    return;
  }
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
