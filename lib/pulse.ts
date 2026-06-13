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
let clicked = false;

// A colour that advances to a new hue on every click, so each click recolours
// the tunnel particles. Golden-ratio hue step → well-spread, never-repeating
// colours; cosine palette keeps them vivid but cohesive on the dark void.
let hue = Math.random();
const clickColor = { r: 0.5, g: 0.7, b: 1.0 };

function rollColor(): void {
  hue = (hue + 0.137) % 1;
  clickColor.r = 0.5 + 0.5 * Math.cos(2 * Math.PI * (hue + 0.0));
  clickColor.g = 0.5 + 0.5 * Math.cos(2 * Math.PI * (hue + 0.33));
  clickColor.b = 0.5 + 0.5 * Math.cos(2 * Math.PI * (hue + 0.66));
}

/** Fire a pulse now (called from a pointerdown listener) + roll a new colour. */
export function firePulse(): void {
  clickTime = performance.now() / 1000;
  clicked = true;
  rollColor();
}

/** Decaying 0→1 envelope since the last click (0 when idle). */
export function getPulse(): number {
  const t = performance.now() / 1000 - clickTime;
  if (t < 0 || t > 2) return 0;
  return Math.exp(-t * DECAY);
}

/** True once the user has clicked at least once (gates the particle tint). */
export function hasClicked(): boolean {
  return clicked;
}

/** Current click colour (same object each call — no per-frame allocation). */
export function getClickColor(): { r: number; g: number; b: number } {
  return clickColor;
}
