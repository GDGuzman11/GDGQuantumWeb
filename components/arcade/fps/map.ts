/**
 * Arena maps for the raycaster. A grid of cells: 0 = floor, >0 = wall (texture
 * id+1). The arena scales with the chosen enemy count (more enemies → bigger,
 * more expansive map). Generation is seeded so a level is reproducible.
 */
import { rng } from './rand';

export interface Level {
  grid: Uint8Array; // w*h, row-major
  w: number;
  h: number;
  spawn: { x: number; y: number; dir: number };
  /** Open floor cells (for spawning enemies/pickups later). */
  openCells: { x: number; y: number }[];
}

export function cell(lvl: Level, mx: number, my: number): number {
  if (mx < 0 || my < 0 || mx >= lvl.w || my >= lvl.h) return 1;
  return lvl.grid[my * lvl.w + mx];
}

/** Build an expansive arena sized by enemy count (1→small, 5→large). */
export function makeArena(enemyCount: number, seed: number): Level {
  const r = rng(seed);
  const size = Math.min(40, 16 + enemyCount * 4); // expands with enemies
  const w = size;
  const h = size;
  const grid = new Uint8Array(w * h);
  const set = (x: number, y: number, v: number) => {
    grid[y * w + x] = v;
  };

  // Solid border walls.
  for (let x = 0; x < w; x++) {
    set(x, 0, 1);
    set(x, h - 1, 1);
  }
  for (let y = 0; y < h; y++) {
    set(0, y, 1);
    set(w - 1, y, 1);
  }

  // Scatter blocky pillars / cover (textures vary), keeping a clear border ring.
  const pillars = Math.round(size * 1.4);
  for (let i = 0; i < pillars; i++) {
    const bx = 3 + Math.floor(r() * (w - 6));
    const by = 3 + Math.floor(r() * (h - 6));
    const bw = 1 + Math.floor(r() * 2);
    const bh = 1 + Math.floor(r() * 2);
    const tex = 1 + Math.floor(r() * 4);
    for (let y = by; y < by + bh && y < h - 2; y++)
      for (let x = bx; x < bx + bw && x < w - 2; x++) set(x, y, tex);
  }

  // Collect open cells; carve the centre clear for the player spawn.
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let y = cy - 1; y <= cy + 1; y++)
    for (let x = cx - 1; x <= cx + 1; x++) set(x, y, 0);

  const openCells: { x: number; y: number }[] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) if (grid[y * w + x] === 0) openCells.push({ x, y });

  return {
    grid,
    w,
    h,
    spawn: { x: cx + 0.5, y: cy + 0.5, dir: 0 },
    openCells,
  };
}
