/**
 * 3D arena level — axis-aligned boxes (each a solid collider AND a textured
 * mesh) + ladders (climb zones with a top exit dir) + spawn. Y is up.
 *
 * The arena is a varied "warzone city": several building archetypes (3-floor
 * towers, 2-floor perches, open platforms, cover bunkers) placed and sized
 * randomly so every level is a different layout. 3-floor towers reach their top
 * via an EXTERNAL ground→2nd ladder, then an INTERIOR hatch in the middle of the
 * 2nd floor up to the 3rd. Map size scales with the chosen enemy count.
 */
import { rng } from './rand';

export interface Box {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  tex: number;
}

export interface Ladder {
  x: number;
  z: number;
  y0: number;
  y1: number;
  sx: number;
  sz: number;
  /** Unit horizontal direction to step onto the floor at the top. */
  exX: number;
  exZ: number;
}

export interface Level3D {
  boxes: Box[];
  ladders: Ladder[];
  spawn: { x: number; z: number; yaw: number };
  size: number;
  seed: number;
}

type Rnd = () => number;
const WALL_H = 4.5;

function columns(boxes: Box[], cx: number, cz: number, half: number, top: number): void {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      boxes.push({ x: cx + sx * half, y: top / 2, z: cz + sz * half, sx: 0.4, sy: top, sz: 0.4, tex: 0 });
}

/** Parapet on −x and +z (leaving +x and −z open to shoot down / for ladders). */
function parapet(boxes: Box[], cx: number, cz: number, half: number, bw: number, ft: number): void {
  boxes.push({ x: cx - half, y: ft + 0.45, z: cz, sx: 0.25, sy: 0.9, sz: bw, tex: 2 });
  boxes.push({ x: cx, y: ft + 0.45, z: cz + half, sx: bw, sy: 0.9, sz: 0.25, tex: 2 });
}

/** 3-floor tower: external ground→2nd ladder + interior centre hatch 2nd→3rd. */
function tower3(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const F3 = 6;
  const top = F3 + 0.6;
  const slab = 0.3;
  const hw = 1.2; // hatch width
  columns(boxes, cx, cz, half, top);

  // 2nd floor — solid slab
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  parapet(boxes, cx, cz, half, bw, F2);

  // 3rd floor — slab with a central hatch (4 segments around the hole)
  boxes.push({ x: cx, y: F3 - slab / 2, z: (cz + hw / 2 + cz + half) / 2, sx: bw, sy: slab, sz: half - hw / 2, tex: 3 });
  boxes.push({ x: cx, y: F3 - slab / 2, z: (cz - hw / 2 + cz - half) / 2, sx: bw, sy: slab, sz: half - hw / 2, tex: 3 });
  boxes.push({ x: (cx + hw / 2 + cx + half) / 2, y: F3 - slab / 2, z: cz, sx: half - hw / 2, sy: slab, sz: hw, tex: 3 });
  boxes.push({ x: (cx - hw / 2 + cx - half) / 2, y: F3 - slab / 2, z: cz, sx: half - hw / 2, sy: slab, sz: hw, tex: 3 });
  parapet(boxes, cx, cz, half, bw, F3);

  // external ground→2nd ladder (−z face), eject +z onto the slab
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
  // interior 2nd→3rd ladder up through the hatch, eject +z onto the north segment
  ladders.push({ x: cx, z: cz, y0: F2, y1: F3 + 0.5, sx: 0.7, sz: 0.7, exX: 0, exZ: 1 });
}

/** 2-floor perch: external ladder to an open upper deck. */
function tower2(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const top = F2 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  parapet(boxes, cx, cz, half, bw, F2);
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Open raised platform on columns — a quick sniper deck. */
function platform(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const H = 2.6;
  const top = H + 0.5;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  boxes.push({ x: cx, y: H - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  boxes.push({ x: cx - half, y: H + 0.4, z: cz, sx: 0.25, sy: 0.8, sz: bw, tex: 2 });
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Ground cover bunker — U of low walls + a crate. No climb. */
function bunker(boxes: Box[], cx: number, cz: number, bw: number, r: Rnd): void {
  const half = bw / 2;
  const h = 2.2;
  boxes.push({ x: cx, y: h / 2, z: cz - half, sx: bw, sy: h, sz: 0.4, tex: 1 });
  boxes.push({ x: cx - half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx + half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx, y: 0.6, z: cz, sx: 1.2, sy: 1.2, sz: 1.2, tex: 1 + Math.floor(r() * 3) });
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  const size = (22 + enemyCount * 6) * 2; // 4× bigger arenas
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];

  // perimeter
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // a varied city of buildings, randomly placed + sized so every level differs
  const placed: { x: number; z: number; rad: number }[] = [];
  const count = Math.round(size / 7);
  for (let i = 0; i < count; i++) {
    const bw = 4 + r() * 4;
    let pos: { x: number; z: number } | null = null;
    for (let t = 0; t < 16; t++) {
      const x = (r() * 2 - 1) * (half - bw - 2);
      const z = (r() * 2 - 1) * (half - bw - 2);
      if (Math.hypot(x, z) < 8) continue; // keep spawn clear
      if (!placed.some((p) => Math.hypot(x - p.x, z - p.z) < bw / 2 + p.rad / 2 + 4)) {
        pos = { x, z };
        break;
      }
    }
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    const pick = r();
    if (pick < 0.3) tower3(boxes, ladders, pos.x, pos.z, Math.max(5, bw));
    else if (pick < 0.55) tower2(boxes, ladders, pos.x, pos.z, bw);
    else if (pick < 0.78) platform(boxes, ladders, pos.x, pos.z, bw);
    else bunker(boxes, pos.x, pos.z, bw, r);
  }

  // scattered cover pillars (avoid spawn + buildings)
  const pillars = Math.round(size * 0.5);
  for (let i = 0; i < pillars; i++) {
    const x = (r() * 2 - 1) * (half - 3);
    const z = (r() * 2 - 1) * (half - 3);
    if (Math.hypot(x, z) < 6) continue;
    if (placed.some((p) => Math.abs(x - p.x) < p.rad / 2 + 2 && Math.abs(z - p.z) < p.rad / 2 + 2)) continue;
    const h = 1.2 + r() * 2;
    const s = 0.9 + r() * 1.2;
    boxes.push({ x, y: h / 2, z, sx: s, sy: h, sz: s, tex: 1 + Math.floor(r() * 3) });
  }

  return { boxes, ladders, spawn: { x: 0, z: 0, yaw: 0 }, size, seed };
}
