/**
 * Shared cursor signal (Layer ③).
 *
 * The tunnel already runs a single damped window `pointermove` listener; rather
 * than add a second listener for the camera rig and the Core, that one handler
 * publishes the normalized cursor here and any in-canvas consumer reads it each
 * frame. Mirrors the mutable-singleton style of `lib/warp.ts` — NOT React state,
 * so the R3F render loop reads the live value without re-rendering.
 *
 *   x, y  — normalized device coords (−1..1), y up.
 *   prox  — 0..1 closeness to screen centre (1 = dead centre / tunnel mouth).
 *
 * `getPointer()` returns the SAME object every call (no per-frame allocation).
 */

const pointer = { x: 0, y: 0, prox: 0 };

export function setPointer(x: number, y: number, prox: number): void {
  pointer.x = x;
  pointer.y = y;
  pointer.prox = prox;
}

export function getPointer(): { x: number; y: number; prox: number } {
  return pointer;
}
