/**
 * 3D arena level — a set of axis-aligned boxes (each a solid collider AND a
 * textured mesh), ladders (climb zones), and a spawn. Y is up. Buildings have
 * a walkable upper floor reachable by a ladder, with an open/low-walled side so
 * you can post up and shoot DOWN on the arena (sniper perches). Map size scales
 * with the chosen enemy count.
 */
import { rng } from './rand';

export interface Box {
  x: number;
  y: number;
  z: number; // centre
  sx: number;
  sy: number;
  sz: number; // full extents
  tex: number;
}

export interface Ladder {
  x: number;
  z: number;
  y0: number;
  y1: number;
  sx: number;
  sz: number;
}

export interface Level3D {
  boxes: Box[];
  ladders: Ladder[];
  spawn: { x: number; z: number; yaw: number };
  size: number;
}

const WALL_H = 4.5;

/**
 * An open multi-level perch tower: corner columns, walkable 2nd + 3rd floor
 * slabs (each with a parapet on two sides, open on +x to shoot DOWN), and two
 * stacked EXTERNAL ladders on the -z side — climb ground→2nd→3rd by walking
 * into them. Each floor has a landing nub so you step off the ladder onto it.
 */
function building(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const half = bw / 2;
  const F2 = 3; // top of 2nd floor
  const F3 = 6; // top of 3rd floor
  const top = F3 + 0.5;
  const slab = 0.3;

  // corner columns (full height)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      boxes.push({ x: cx + sx * half, y: top / 2, z: cz + sz * half, sx: 0.4, sy: top, sz: 0.4, tex: 0 });

  // 2nd + 3rd floor slabs + parapets (open on the −z / +x sides for the ladders
  // and shoot-down).
  for (const ft of [F2, F3]) {
    boxes.push({ x: cx, y: ft - slab / 2, z: cz, sx: bw, sy: slab, sz: bw, tex: 3 });
    boxes.push({ x: cx - half, y: ft + 0.45, z: cz, sx: 0.25, sy: 0.9, sz: bw, tex: 2 });
    boxes.push({ x: cx, y: ft + 0.45, z: cz + half, sx: bw, sy: 0.9, sz: 0.25, tex: 2 });
  }

  // Ladder A: GROUND → 2nd, on the −z face. Step off onto a −z landing nub.
  ladders.push({ x: cx, z: cz - half - 0.35, y0: 0, y1: F2 + 0.2, sx: 0.9, sz: 0.45 });
  boxes.push({ x: cx, y: F2 - slab / 2, z: cz - half - 0.2, sx: 1.6, sy: slab, sz: 0.8, tex: 3 });

  // Ladder B: 2nd → 3rd, on the +x face — a DIFFERENT spot, so you cross the
  // 2nd floor to reach it. No direct ground→3rd route. Step off onto a +x nub.
  ladders.push({ x: cx + half + 0.35, z: cz, y0: F2, y1: F3 + 0.2, sx: 0.45, sz: 0.9 });
  boxes.push({ x: cx + half + 0.2, y: F3 - slab / 2, z: cz, sx: 0.8, sy: slab, sz: 1.6, tex: 3 });
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  // 4× bigger arenas (2× per side) for expansive, sniper-friendly maps.
  const size = (22 + enemyCount * 6) * 2;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];

  // perimeter walls
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // Multi-level perch towers FIRST, so cover pillars can avoid them.
  const sites = [
    { x: half * 0.5, z: half * 0.5, bw: 7 },
    { x: -half * 0.5, z: -half * 0.45, bw: 7 },
    { x: -half * 0.55, z: half * 0.5, bw: 6 },
  ];
  if (size > 70) sites.push({ x: half * 0.5, z: -half * 0.55, bw: 6 });
  for (const s of sites) building(boxes, ladders, s.x, s.z, s.bw);

  // Cover pillars — skip the spawn and a clearance ring around each tower (so
  // nothing blocks the buildings or their ladder approaches).
  const pillars = Math.round(size * 0.7);
  for (let i = 0; i < pillars; i++) {
    const x = (r() * 2 - 1) * (half - 3);
    const z = (r() * 2 - 1) * (half - 3);
    if (Math.hypot(x, z) < 5) continue; // spawn clear
    const nearBuilding = sites.some(
      (s) => Math.abs(x - s.x) < s.bw / 2 + 3 && Math.abs(z - s.z) < s.bw / 2 + 3,
    );
    if (nearBuilding) continue;
    const h = 1.5 + r() * 2.5;
    const sdim = 1 + r() * 1.4;
    boxes.push({ x, y: h / 2, z, sx: sdim, sy: h, sz: sdim, tex: 1 + Math.floor(r() * 3) });
  }

  return { boxes, ladders, spawn: { x: 0, z: 0, yaw: 0 }, size };
}
