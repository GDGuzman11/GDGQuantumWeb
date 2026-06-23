/**
 * Enemy bots + adaptive AI. Bots DON'T know where you are until they SEE you
 * (a line-of-sight raycast, blocked by walls). Once they spot you they go
 * alert, chase to a preferred range, strafe, and shoot — leading your movement,
 * so holding a straight line gets you hit while juking/relocating throws them
 * off. Break line of sight and they advance on your last-known spot, then give
 * up. Difficulty scales reaction, accuracy, speed, damage, and view range.
 */
import { segBlocked, type Vec3 } from './combat';
import type { Level3D } from './level3d';
import { EYE, type Player3 } from './physics';

export type Difficulty = 'normal' | 'hard' | 'nightmare';

export interface Enemy {
  x: number;
  y: number;
  z: number;
  health: number;
  state: 'idle' | 'alert';
  lastSeen: { x: number; z: number } | null;
  fireCd: number;
  hitFlash: number;
  wander: number;
}

const R = 0.45; // collision radius
const EYE_H = 1.4;

interface Params {
  acc: number;
  dmg: number;
  rate: number;
  speed: number;
  view: number;
}
const PARAMS: Record<Difficulty, Params> = {
  normal: { acc: 0.3, dmg: 7, rate: 1.1, speed: 2.4, view: 48 },
  hard: { acc: 0.45, dmg: 9, rate: 0.85, speed: 3.0, view: 64 },
  nightmare: { acc: 0.62, dmg: 12, rate: 0.62, speed: 3.6, view: 84 },
};

function blocked(lvl: Level3D, x: number, z: number): boolean {
  for (const b of lvl.boxes) {
    if (
      x + R > b.x - b.sx / 2 &&
      x - R < b.x + b.sx / 2 &&
      z + R > b.z - b.sz / 2 &&
      z - R < b.z + b.sz / 2 &&
      b.y - b.sy / 2 < 1.6 // only ground-level obstacles matter to a grounded bot
    ) {
      return true;
    }
  }
  return false;
}

function moveEnemy(e: Enemy, lvl: Level3D, wx: number, wz: number, speed: number, dt: number): void {
  const l = Math.hypot(wx, wz);
  if (l < 0.01) return;
  const sp = (speed * dt) / l;
  const nx = e.x + wx * sp;
  const nz = e.z + wz * sp;
  if (!blocked(lvl, nx, e.z)) e.x = nx;
  if (!blocked(lvl, e.x, nz)) e.z = nz;
}

export function spawnEnemies(lvl: Level3D, count: number, rand: () => number): Enemy[] {
  const out: Enemy[] = [];
  const half = lvl.size / 2;
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const x = (rand() * 2 - 1) * (half - 4);
    const z = (rand() * 2 - 1) * (half - 4);
    if (Math.hypot(x, z) < 12) continue; // away from the player's spawn
    if (blocked(lvl, x, z)) continue;
    out.push({ x, y: 0, z, health: 100, state: 'idle', lastSeen: null, fireCd: rand() * 0.6, hitFlash: 0, wander: rand() * 6 });
  }
  return out;
}

export interface EnemyTracer {
  from: Vec3;
  to: Vec3;
}

/** Advance all bots. Returns damage dealt to the player + tracers to render. */
export function updateEnemies(
  enemies: Enemy[],
  player: Player3,
  lvl: Level3D,
  diff: Difficulty,
  pvx: number,
  pvz: number,
  dt: number,
  now: number,
): { damage: number; tracers: EnemyTracer[] } {
  const P = PARAMS[diff];
  const peye: Vec3 = [player.x, player.y + EYE, player.z];
  const pspeed = Math.hypot(pvx, pvz);
  let damage = 0;
  const tracers: EnemyTracer[] = [];

  for (const e of enemies) {
    if (e.health <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    const eeye: Vec3 = [e.x, e.y + EYE_H, e.z];
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    const sees = dist < P.view && !segBlocked(eeye, peye, lvl);
    if (sees) {
      e.state = 'alert';
      e.lastSeen = { x: player.x, z: player.z };
    }

    if (e.state === 'alert' && e.lastSeen) {
      const tx = e.lastSeen.x - e.x;
      const tz = e.lastSeen.z - e.z;
      const td = Math.hypot(tx, tz) || 1;
      const dirx = tx / td;
      const dirz = tz / td;
      const want = 9; // preferred engagement range
      const mv = td > want + 1.5 ? 1 : td < want - 1.5 ? -0.7 : 0;
      const strafe = Math.sin(now / 650 + e.wander) * 0.6;
      moveEnemy(e, lvl, dirx * mv - dirz * strafe, dirz * mv + dirx * strafe, P.speed, dt);

      e.fireCd -= dt;
      if (sees && e.fireCd <= 0) {
        e.fireCd = P.rate;
        tracers.push({ from: eeye, to: peye });
        // Leads your motion: moving (and changing direction) throws the shot off.
        const evade = Math.min(0.7, pspeed * 0.14);
        if (Math.random() < P.acc * (1 - evade)) damage += P.dmg;
      }
      if (!sees && td < 1.5) {
        e.state = 'idle';
        e.lastSeen = null;
      }
    } else {
      // idle wander
      moveEnemy(e, lvl, Math.sin(now / 1500 + e.wander), Math.cos(now / 1700 + e.wander * 2), P.speed * 0.35, dt);
    }
  }
  return { damage, tracers };
}
