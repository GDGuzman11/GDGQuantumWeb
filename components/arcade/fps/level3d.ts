/**
 * 3D arena level — axis-aligned boxes (each a solid collider AND a textured
 * mesh) + ladders (climb zones with a top exit dir) + spawn. Y is up.
 *
 * A varied "warzone city": walled buildings (window bands → they read as
 * buildings, with an open front for entry / shooting), drawn from several
 * archetypes and placed so multi-floor towers sit FAR apart. 3-floor towers go
 * up via an external ground→2nd ladder, then an interior ladder in the open
 * front up onto a back mezzanine (a big, easy 3rd-floor opening). Map size
 * scales with the chosen enemy count.
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
  exX: number; // unit dir to step onto the floor at the top
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
const STORY = 3; // floor-to-floor height

function columns(boxes: Box[], cx: number, cz: number, half: number, top: number): void {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      boxes.push({ x: cx + sx * half, y: top / 2, z: cz + sz * half, sx: 0.4, sy: top, sz: 0.4, tex: 0 });
}

/** A wall for one story with a window band cut out (sill + lintel). */
function windowWall(boxes: Box[], cx: number, cz: number, sx: number, sz: number, yBase: number): void {
  boxes.push({ x: cx, y: yBase + 0.5, z: cz, sx, sy: 1, sz, tex: 1 }); // sill
  boxes.push({ x: cx, y: yBase + 2.6, z: cz, sx, sy: 0.8, sz, tex: 1 }); // lintel
}

/** Window walls on −x, +x and +z (open front on −z) for a story. */
function shell(boxes: Box[], cx: number, cz: number, half: number, bw: number, yBase: number): void {
  windowWall(boxes, cx - half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx + half, cz, 0.3, bw, yBase);
  windowWall(boxes, cx, cz + half, bw, 0.3, yBase);
}

/** 3-floor walled building: external ground→2nd ladder, interior ladder up to a
 *  back mezzanine (the open front is the big 3rd-floor access + shoot-down). */
function tower3(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const F3 = 6;
  const top = F3 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  shell(boxes, cx, cz, half, bw, 0); // ground story walls
  shell(boxes, cx, cz, half, bw, F2); // 2nd story walls

  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 }); // 2nd floor
  // 3rd-floor mezzanine over the back half (front half open = the access/opening)
  boxes.push({ x: cx, y: F3 - slab / 2, z: cz + half / 2, sx: bw, sy: slab, sz: half, tex: 3 });

  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
  ladders.push({ x: cx, z: cz - 0.5, y0: F2, y1: F3 + 0.5, sx: 1, sz: 0.9, exX: 0, exZ: 1 });
}

/** 2-floor walled perch: ground walls + open upper deck, external ladder. */
function tower2(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3;
  const top = F2 + 0.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, top);
  shell(boxes, cx, cz, half, bw, 0);
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  // perch rails on 3 sides (open front −z)
  boxes.push({ x: cx - half, y: F2 + 0.4, z: cz, sx: 0.2, sy: 0.8, sz: bw, tex: 2 });
  boxes.push({ x: cx + half, y: F2 + 0.4, z: cz, sx: 0.2, sy: 0.8, sz: bw, tex: 2 });
  boxes.push({ x: cx, y: F2 + 0.4, z: cz + half, sx: bw, sy: 0.8, sz: 0.2, tex: 2 });
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Open raised platform on columns — quick sniper deck. */
function platform(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const H = 2.6;
  const slab = 0.3;
  columns(boxes, cx, cz, half, H + 0.5);
  boxes.push({ x: cx, y: H - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
  boxes.push({ x: cx, y: H + 0.4, z: cz + half, sx: bw, sy: 0.8, sz: 0.2, tex: 2 });
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: H + 0.5, sx: 0.9, sz: 0.45, exX: 0, exZ: 1 });
}

/** Ground cover bunker — U of low walls + a crate. */
function bunker(boxes: Box[], cx: number, cz: number, bw: number, r: Rnd): void {
  const half = bw / 2;
  const h = 2.2;
  boxes.push({ x: cx, y: h / 2, z: cz + half, sx: bw, sy: h, sz: 0.4, tex: 1 });
  boxes.push({ x: cx - half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx + half, y: h / 2, z: cz, sx: 0.4, sy: h, sz: bw, tex: 1 });
  boxes.push({ x: cx, y: 0.6, z: cz, sx: 1.2, sy: 1.2, sz: 1.2, tex: 1 + Math.floor(r() * 3) });
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  const size = (22 + enemyCount * 6) * 2;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];

  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  const placed: { x: number; z: number; rad: number }[] = [];
  const tryPlace = (rad: number, minGap: number): { x: number; z: number } | null => {
    for (let t = 0; t < 24; t++) {
      const x = (r() * 2 - 1) * (half - rad - 2);
      const z = (r() * 2 - 1) * (half - rad - 2);
      if (Math.hypot(x, z) < 9) continue;
      if (!placed.some((p) => Math.hypot(x - p.x, z - p.z) < p.rad / 2 + rad / 2 + minGap)) return { x, z };
    }
    return null;
  };

  // Multi-floor towers FIRST, spaced FAR apart.
  const towerCount = Math.max(2, Math.round(size / 26));
  for (let i = 0; i < towerCount; i++) {
    const bw = 6 + r() * 3;
    const pos = tryPlace(bw, size * 0.22);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    (r() < 0.6 ? tower3 : tower2)(boxes, ladders, pos.x, pos.z, bw);
  }
  // Then smaller structures fill the gaps (platforms + bunkers).
  const fillers = Math.round(size / 9);
  for (let i = 0; i < fillers; i++) {
    const bw = 4 + r() * 3;
    const pos = tryPlace(bw, 5);
    if (!pos) continue;
    placed.push({ x: pos.x, z: pos.z, rad: bw });
    if (r() < 0.5) platform(boxes, ladders, pos.x, pos.z, bw);
    else bunker(boxes, pos.x, pos.z, bw, r);
  }

  // Cover pillars (avoid spawn + structures).
  const pillars = Math.round(size * 0.45);
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
