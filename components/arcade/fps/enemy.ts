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
  maxHealth: number;
  state: 'idle' | 'alert';
  lastSeen: { x: number; z: number } | null;
  fireCd: number;
  hitFlash: number;
  wander: number;
  step: number; // accumulated gait distance (drives the run animation)
  alarm: number; // seconds of "under fire" evasive behaviour after being shot
  weapon: WeaponKind;
}

export type WeaponKind = 'rifle' | 'mg' | 'laser';
const ENEMY_HP = 500; // 5× tougher

// The aliens draw from the same weapon families the player does.
const WEAPONS: Record<WeaponKind, { rate: number; dmg: number; accMod: number; color: number }> = {
  rifle: { rate: 0.9, dmg: 9, accMod: 1.0, color: 0xff8a4a },
  mg: { rate: 0.16, dmg: 4, accMod: 0.5, color: 0xff5d6e },
  laser: { rate: 1.2, dmg: 13, accMod: 1.1, color: 0x7fdfff },
};
const WEAPON_KEYS: WeaponKind[] = ['rifle', 'mg', 'laser'];

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
  e.step += speed * dt * 1.3; // advance the running gait
}

export function spawnEnemies(lvl: Level3D, count: number, rand: () => number): Enemy[] {
  const out: Enemy[] = [];
  const half = lvl.size / 2;
  const a = lvl.enemySpawn; // far end, opposite the player
  const R = Math.max(6, lvl.size * 0.16);
  let guard = 0;
  while (out.length < count && guard++ < count * 90) {
    const ang = rand() * Math.PI * 2;
    const rad = rand() * R;
    const x = a.x + Math.cos(ang) * rad;
    const z = a.z + Math.sin(ang) * rad;
    if (Math.abs(x) > half - 3 || Math.abs(z) > half - 3) continue;
    if (blocked(lvl, x, z)) continue;
    out.push({ x, y: 0, z, health: ENEMY_HP, maxHealth: ENEMY_HP, state: 'idle', lastSeen: null, fireCd: rand() * 0.6, hitFlash: 0, wander: rand() * 6, step: 0, alarm: 0, weapon: WEAPON_KEYS[Math.floor(rand() * WEAPON_KEYS.length)] });
  }
  return out;
}

export interface EnemyTracer {
  from: Vec3;
  to: Vec3;
  color: number;
}

/** Advance all bots. Returns damage dealt to the player, tracers to render, and
 *  whether ANY bot currently has line-of-sight to the player (gates regen). */
export function updateEnemies(
  enemies: Enemy[],
  player: Player3,
  lvl: Level3D,
  diff: Difficulty,
  pvx: number,
  pvz: number,
  dt: number,
  now: number,
): { damage: number; tracers: EnemyTracer[]; seen: boolean } {
  const P = PARAMS[diff];
  const peye: Vec3 = [player.x, player.y + EYE, player.z];
  const pspeed = Math.hypot(pvx, pvz);
  let damage = 0;
  let seen = false;
  const tracers: EnemyTracer[] = [];

  for (const e of enemies) {
    if (e.health <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.alarm > 0) e.alarm -= dt;
    const eeye: Vec3 = [e.x, e.y + EYE_H, e.z];
    const dist = Math.hypot(player.x - e.x, player.z - e.z);
    const sees = dist < P.view && !segBlocked(eeye, peye, lvl);
    if (sees) {
      seen = true;
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
      // "Under fire" → faster + harder strafing (adapts to being shot at).
      const boosted = e.alarm > 0;
      const strafe = Math.sin(now / 650 + e.wander) * (boosted ? 1.05 : 0.6);
      moveEnemy(e, lvl, dirx * mv - dirz * strafe, dirz * mv + dirx * strafe, P.speed * (boosted ? 1.3 : 1), dt);

      e.fireCd -= dt;
      const W = WEAPONS[e.weapon];
      if (sees && e.fireCd <= 0) {
        e.fireCd = W.rate;
        tracers.push({ from: eeye, to: peye, color: W.color });
        // Moving throws the shot off; distance makes them much less accurate.
        const evade = Math.min(0.7, pspeed * 0.14);
        const distFactor = Math.max(0.12, 1 - Math.max(0, dist - 8) / 38);
        if (Math.random() < P.acc * W.accMod * distFactor * (1 - evade)) damage += W.dmg;
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
  return { damage, tracers, seen };
}
