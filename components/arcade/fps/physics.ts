/**
 * Player physics for the 3D FPS. Capsule-ish AABB vs the level's box colliders,
 * per-axis resolution (so you slide along walls and stand on upper floors),
 * gravity + jump, and ladder zones you climb by simply walking into them.
 */
import type { Box, Ladder, Level3D } from './level3d';

export interface Player3 {
  x: number;
  y: number; // feet
  z: number;
  vy: number;
  yaw: number;
  pitch: number;
  onGround: boolean;
  health: number;
}

export const EYE = 1.5;
export const MAX_PITCH = 1.45; // ~83°
const R = 0.3;
const H = 1.7;
const MOVE = 4.6;
const GRAV = 22;
const JUMP = 7.2;
const CLIMB = 3.4;

export interface MoveInput {
  fwd: number;
  strafe: number;
  jump: boolean;
}

export function makePlayer3(spawn: { x: number; z: number; yaw: number }): Player3 {
  return { x: spawn.x, y: 0, z: spawn.z, vy: 0, yaw: spawn.yaw, pitch: 0, onGround: true, health: 100 };
}

function overlapXZ(p: Player3, b: Box): boolean {
  return (
    p.x + R > b.x - b.sx / 2 &&
    p.x - R < b.x + b.sx / 2 &&
    p.z + R > b.z - b.sz / 2 &&
    p.z - R < b.z + b.sz / 2
  );
}
function overlapY(p: Player3, b: Box): boolean {
  return p.y + H > b.y - b.sy / 2 && p.y < b.y + b.sy / 2;
}

function inLadder(p: Player3, l: Ladder): boolean {
  return (
    p.x > l.x - l.sx / 2 - R &&
    p.x < l.x + l.sx / 2 + R &&
    p.z > l.z - l.sz / 2 - R &&
    p.z < l.z + l.sz / 2 + R &&
    p.y > l.y0 - 0.6 &&
    p.y < l.y1 + 0.6
  );
}

export function stepPlayer(p: Player3, lvl: Level3D, input: MoveInput, dt: number): void {
  // Horizontal wish direction from yaw.
  const fX = -Math.sin(p.yaw);
  const fZ = -Math.cos(p.yaw);
  const rX = -fZ;
  const rZ = fX;
  let wx = fX * input.fwd + rX * input.strafe;
  let wz = fZ * input.fwd + rZ * input.strafe;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) {
    wx /= wl;
    wz /= wl;
  }
  let vx = wx * MOVE;
  let vz = wz * MOVE;

  const onLadder = lvl.ladders.some((l) => inLadder(p, l));
  if (onLadder) {
    // On a ladder you can't walk through it: horizontal is locked and your
    // forward/back input becomes climb up / down. Gravity is suspended.
    vx = 0;
    vz = 0;
    p.vy = input.fwd > 0.05 ? CLIMB : input.fwd < -0.05 ? -CLIMB : 0;
  } else {
    if (input.jump && p.onGround) {
      p.vy = JUMP;
      p.onGround = false;
    }
    p.vy -= GRAV * dt;
  }

  // Move + collide, one axis at a time.
  p.x += vx * dt;
  for (const b of lvl.boxes) {
    if (overlapXZ(p, b) && overlapY(p, b)) p.x = vx > 0 ? b.x - b.sx / 2 - R : b.x + b.sx / 2 + R;
  }
  p.z += vz * dt;
  for (const b of lvl.boxes) {
    if (overlapXZ(p, b) && overlapY(p, b)) p.z = vz > 0 ? b.z - b.sz / 2 - R : b.z + b.sz / 2 + R;
  }

  p.y += p.vy * dt;
  p.onGround = false;
  for (const b of lvl.boxes) {
    if (!overlapXZ(p, b) || !overlapY(p, b)) continue;
    if (p.vy <= 0) {
      // landing on top of a box
      p.y = b.y + b.sy / 2;
      p.vy = 0;
      p.onGround = true;
    } else {
      // bonk a ceiling
      p.y = b.y - b.sy / 2 - H;
      p.vy = 0;
    }
  }
  if (p.y <= 0) {
    p.y = 0;
    if (p.vy < 0) p.vy = 0;
    p.onGround = true;
  }
}
