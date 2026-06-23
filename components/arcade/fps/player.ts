/**
 * First-person player state + movement. Classic raycaster camera: a direction
 * vector + a camera plane (perpendicular, length = tan(fov/2)). Movement is
 * forward/strafe with per-axis wall collision; looking rotates dir + plane.
 */
import { cell, type Level } from './map';

export interface Player {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  health: number;
}

const FOV = 0.66; // ~66° — the Wolf3D/Doom default feel
const MOVE_SPEED = 3.2; // cells per second
const RADIUS = 0.2; // collision buffer

export function makePlayer(spawn: { x: number; y: number; dir: number }): Player {
  const dirX = Math.cos(spawn.dir);
  const dirY = Math.sin(spawn.dir);
  return {
    x: spawn.x,
    y: spawn.y,
    dirX,
    dirY,
    planeX: -dirY * FOV,
    planeY: dirX * FOV,
    health: 100,
  };
}

/** Rotate the camera by `a` radians (positive = turn right). */
export function rotate(p: Player, a: number): void {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = p.dirX;
  p.dirX = dx * c - p.dirY * s;
  p.dirY = dx * s + p.dirY * c;
  const px = p.planeX;
  p.planeX = px * c - p.planeY * s;
  p.planeY = px * s + p.planeY * c;
}

/** Move with forward (`fwd`) and strafe (`strafe`) in [-1,1], dt in seconds. */
export function movePlayer(p: Player, lvl: Level, fwd: number, strafe: number, dt: number): void {
  const sp = MOVE_SPEED * dt;
  // strafe axis = dir rotated 90° (right)
  const rightX = p.dirY;
  const rightY = -p.dirX;
  const mx = p.dirX * fwd * sp + rightX * strafe * sp;
  const my = p.dirY * fwd * sp + rightY * strafe * sp;
  // Per-axis collision so you slide along walls.
  if (cell(lvl, Math.floor(p.x + Math.sign(mx) * RADIUS + mx), Math.floor(p.y)) === 0) p.x += mx;
  if (cell(lvl, Math.floor(p.x), Math.floor(p.y + Math.sign(my) * RADIUS + my)) === 0) p.y += my;
}
