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

function building(boxes: Box[], ladders: Ladder[], cx: number, cz: number, bw: number): void {
  const GH = 3; // ground-storey wall height
  const half = bw / 2;
  // ground walls (back full, left full, right = low "window" wall to shoot over)
  boxes.push({ x: cx, y: GH / 2, z: cz - half, sx: bw, sy: GH, sz: 0.4, tex: 1 });
  boxes.push({ x: cx - half, y: GH / 2, z: cz, sx: 0.4, sy: GH, sz: bw, tex: 1 });
  boxes.push({ x: cx + half, y: 0.6, z: cz, sx: 0.4, sy: 1.2, sz: bw, tex: 1 }); // window wall
  // front wall with a doorway gap in the middle
  boxes.push({ x: cx - bw / 4 - 0.5, y: GH / 2, z: cz + half, sx: bw / 2 - 1, sy: GH, sz: 0.4, tex: 1 });
  boxes.push({ x: cx + bw / 4 + 0.5, y: GH / 2, z: cz + half, sx: bw / 2 - 1, sy: GH, sz: 0.4, tex: 1 });
  // upper floor slab
  boxes.push({ x: cx, y: GH + 0.15, z: cz, sx: bw, sy: 0.3, sz: bw, tex: 3 });
  // parapet around the top — open on the +x side for shooting down
  boxes.push({ x: cx, y: GH + 0.75, z: cz - half, sx: bw, sy: 0.9, sz: 0.3, tex: 2 });
  boxes.push({ x: cx - half, y: GH + 0.75, z: cz, sx: 0.3, sy: 0.9, sz: bw, tex: 2 });
  boxes.push({ x: cx, y: GH + 0.75, z: cz + half, sx: bw, sy: 0.9, sz: 0.3, tex: 2 });
  // ladder up to the slab (back-left inside corner)
  ladders.push({ x: cx - half + 1, z: cz - half + 1, y0: 0, y1: GH + 0.4, sx: 0.9, sz: 0.9 });
}

export function makeArena3D(enemyCount: number, seed: number): Level3D {
  const r = rng(seed);
  const size = 22 + enemyCount * 6;
  const half = size / 2;
  const boxes: Box[] = [];
  const ladders: Ladder[] = [];

  // perimeter walls
  boxes.push({ x: 0, y: WALL_H / 2, z: -half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: 0, y: WALL_H / 2, z: half, sx: size, sy: WALL_H, sz: 0.6, tex: 0 });
  boxes.push({ x: -half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });
  boxes.push({ x: half, y: WALL_H / 2, z: 0, sx: 0.6, sy: WALL_H, sz: size, tex: 0 });

  // cover pillars (kept off the centre + edges so lanes/sightlines stay open)
  const pillars = Math.round(size * 0.8);
  for (let i = 0; i < pillars; i++) {
    const x = (r() * 2 - 1) * (half - 3);
    const z = (r() * 2 - 1) * (half - 3);
    if (Math.hypot(x, z) < 4) continue; // keep spawn clear
    const h = 1.5 + r() * 2.5;
    const s = 1 + r() * 1.4;
    boxes.push({ x, y: h / 2, z, sx: s, sy: h, sz: s, tex: 1 + Math.floor(r() * 3) });
  }

  // 1–2 buildings (sniper perches) depending on arena size
  building(boxes, ladders, half * 0.5, half * 0.5, 6);
  if (size > 30) building(boxes, ladders, -half * 0.5, -half * 0.45, 6);

  return { boxes, ladders, spawn: { x: 0, z: 0, yaw: 0 }, size };
}
