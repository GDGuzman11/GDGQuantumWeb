/**
 * Destructible terrain — a per-column heightmap (height = y of the surface;
 * ground exists for y >= height). Asteroid/planet ridge generated from layered
 * value noise. No caves (single surface per column), the standard artillery
 * simplification, so craters just lower the surface.
 */
import { GAME_H, GAME_W } from './types';

export type Terrain = Float32Array; // length GAME_W, surface y per column

/** Tiny deterministic PRNG (mulberry32) so a level seed is reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a rolling surface. `rough` raises the bumpiness (harder levels). */
export function generateTerrain(seed: number, rough = 1): Terrain {
  const r = rng(seed);
  const t = new Float32Array(GAME_W);
  const base = GAME_H * 0.66;
  // A few sine octaves with random phase/amplitude → organic ridgeline.
  const octaves = [
    { len: GAME_W / 1.3, amp: 70 * rough, ph: r() * Math.PI * 2 },
    { len: GAME_W / 3.1, amp: 34 * rough, ph: r() * Math.PI * 2 },
    { len: GAME_W / 7.7, amp: 16 * rough, ph: r() * Math.PI * 2 },
    { len: GAME_W / 17, amp: 7 * rough, ph: r() * Math.PI * 2 },
  ];
  for (let x = 0; x < GAME_W; x++) {
    let h = base;
    for (const o of octaves) h -= Math.sin((x / o.len) * Math.PI * 2 + o.ph) * o.amp;
    t[x] = clampH(h);
  }
  return t;
}

function clampH(h: number): number {
  return Math.max(GAME_H * 0.28, Math.min(GAME_H - 8, h));
}

export function heightAt(t: Terrain, x: number): number {
  const i = Math.max(0, Math.min(GAME_W - 1, Math.round(x)));
  return t[i];
}

/** Carve a crater (lower the surface) of radius `r` centred at (cx, cy). */
export function carve(t: Terrain, cx: number, cy: number, r: number): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(GAME_W - 1, Math.ceil(cx + r));
  for (let x = x0; x <= x1; x++) {
    const dx = x - cx;
    const dy2 = r * r - dx * dx;
    if (dy2 <= 0) continue;
    const bottom = cy + Math.sqrt(dy2); // lowest point of removed ground
    if (bottom > t[x]) t[x] = clampH(bottom); // eat ground down to the crater floor
  }
}

/** Add ground (dirt-builder weapons) — raise the surface toward (cx, cy). */
export function mound(t: Terrain, cx: number, cy: number, r: number): void {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(GAME_W - 1, Math.ceil(cx + r));
  for (let x = x0; x <= x1; x++) {
    const dx = x - cx;
    const dy2 = r * r - dx * dx;
    if (dy2 <= 0) continue;
    const top = cy - Math.sqrt(dy2);
    if (top < t[x]) t[x] = clampH(top);
  }
}
